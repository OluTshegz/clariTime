;; Transaction History Tracking for Time-locked Wallet
;; This contract maintains a history of each user’s transactions, allowing them to retrieve transaction details

(define-constant err-unauthorized (err u401))

;; Map to store transaction history
;; Key: A tuple of user principal and transaction ID (u0, u1, etc.)
;; Value: A tuple containing the type, amount, and timestamp of the transaction
(define-map transaction-history
  { user: principal, tx-id: uint }
  { tx-type: (string-ascii 20), amount: uint, timestamp: uint }
)

;; Map to keep track of the number of transactions per user
;; Key: User principal
;; Value: Counter of transaction ID
(define-map transaction-counter
  principal
  uint
)

;; Public function to record a transaction
;; @param user: The principal performing the transaction
;; @param tx-type: The type of transaction (e.g., "deposit", "withdrawal", "penalty")
;; @param amount: The amount involved in the transaction
;; @param timestamp: The block height at which the transaction took place
(define-public (record-transaction (user principal) (tx-type (string-ascii 20)) (amount uint) (timestamp uint))
  (begin
    ;; Only the contract can call this function to prevent unauthorized access
    (asserts! (is-eq tx-sender (as-contract tx-sender)) err-unauthorized)
    
    ;; Retrieve and increment the user’s transaction counter
    (let ((current-counter (default-to u0 (map-get? transaction-counter user))))
      (map-set transaction-counter user (+ current-counter u1))
      
      ;; Record the transaction in the history map
      (map-set transaction-history
        { user: user, tx-id: current-counter }
        { tx-type: tx-type, amount: amount, timestamp: timestamp }
      )
    )
    (ok true)
  )
)

;; Read-only function to get a transaction for a user by transaction ID
;; @param user: The principal of the user whose transaction history is being accessed
;; @param tx-id: The transaction ID to retrieve
;; @return: Transaction details or error if not found
(define-read-only (get-transaction (user principal) (tx-id uint))
  (ok (map-get? transaction-history { user: user, tx-id: tx-id }))
)

;; Read-only function to get the total number of transactions for a user
;; @param user: The principal of the user
;; @return: Total transaction count for the user
(define-read-only (get-transaction-count (user principal))
  (default-to u0 (map-get? transaction-counter user))
)
