;; Notifications and Reminders Module
;; This contract allows users to set reminders for important actions (withdrawals, deposits, etc.)

(define-constant err-invalid-time (err u100)) ;; Error for invalid reminder time
(define-constant err-not-owner (err u101)) ;; Error for actions not permitted by others

(define-map user-reminders principal
  (list 20 { reminder-id: uint, message: (string-ascii 64), remind-time: uint, notified: bool })
)

(define-data-var reminder-id-counter uint u1) ;; Tracks unique IDs for reminders

;; Public function for users to set reminders
;; @param message: A message to be reminded of (max 64 characters)
;; @param remind-time: Block height for when the reminder is due
;; @return: Reminder ID on success, error otherwise
(define-public (set-reminder (message (string-ascii 64)) (remind-time uint))
  (let
    ((current-block block-height)
     (next-id (var-get reminder-id-counter))
     (current-reminders (default-to (list) (map-get? user-reminders tx-sender))))
    (if (<= remind-time current-block)
      err-invalid-time
      (begin
        (map-set user-reminders tx-sender
          (unwrap! (as-max-len? (append current-reminders
            (list { reminder-id: next-id, message: message, remind-time: remind-time, notified: false })) u20) err-not-owner))
        (var-set reminder-id-counter (+ next-id u1))
        (ok next-id)
      )
    )
  )
)

;; Read-only function to retrieve upcoming reminders for a user
;; @return: List of reminders that have not been notified and are due within the next 10 blocks
(define-read-only (get-upcoming-reminders (user principal))
  (filter (lambda (reminder) (and (>= (get remind-time reminder) block-height) (not (get notified reminder))))
    (default-to (list) (map-get? user-reminders user)))
)

;; Private function to mark a reminder as notified
;; @param user: Principal of the user
;; @param reminder-id: ID of the reminder to mark
;; @return: true on success, error if unauthorized
(define-public (mark-as-notified (user principal) (reminder-id uint))
  (let
    ((current-reminders (default-to (list) (map-get? user-reminders user))))
    (if (is-eq user tx-sender)
      (begin
        (map-set user-reminders user
          (map (lambda (reminder)
                  (if (is-eq (get reminder-id reminder) reminder-id)
                      (merge reminder { notified: true })
                      reminder))
                current-reminders))
        (ok true)
      )
      err-not-owner
    )
  )
)


;; notifications.clar
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-allowed (err u101))

;; Define a map to store user notifications
(define-map user-notifications principal (list (tuple (message string) (timestamp uint))))

(define-public (add-notification (user principal) (message string))
  (asserts!
    (eq tx-sender contract-owner) err-owner-only
  )
  (map-set user-notifications user
    (append (default-to (list) (map-get? user-notifications user))
            (list (tuple (message message) (timestamp (block-height)))))
  )
  (ok true)
)

(define-read-only (get-notifications (user principal))
  (default-to (list) (map-get? user-notifications user))
)

(define-public (send-notification (user principal) (message string))
  ;; This function can be used to trigger an external notification service
  (let ((notifications (get-notifications user)))
    (if (is-none notifications)
      (ok false)
      (begin
        ;; Logic to send the notification through an external service can be added here
        ;; For now, we'll just return the message
        (ok (format "Notification sent: {}", message))
      )
    )
  )
)
