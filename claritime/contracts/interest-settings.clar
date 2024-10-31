;; Interest Rate Settings Module
;; This contract file provides functionalities for setting and retrieving user-specific interest rates

(define-constant default-interest-rate u5) ;; Default interest rate set to 5%
(define-constant min-interest-rate u1) ;; Minimum allowable interest rate to ensure value

(define-map user-interest-rates principal uint)

(define-constant err-invalid-rate (err u100)) ;; Error if interest rate is below the minimum
(define-constant err-not-found (err u404)) ;; Error if user interest rate isn't found

;; Public function to set a user-specific interest rate
;; @param rate: The interest rate specified by the user
;; @return: true if rate is set successfully, otherwise an error
(define-public (set-interest-rate (rate uint))
  (if (>= rate min-interest-rate)
    (begin
      (map-set user-interest-rates tx-sender rate)
      (ok true)
    )
    err-invalid-rate
  )
)

;; Public function to retrieve the user-specific interest rate
;; @param user: The principal of the user whose rate is queried
;; @return: The user's set interest rate or default rate if not set
(define-read-only (get-interest-rate (user principal))
  (default-to default-interest-rate (map-get? user-interest-rates user))
)
