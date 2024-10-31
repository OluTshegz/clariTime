;; Interest Calculation Module
;; This contract calculates accrued interest for a user based on their custom interest rate and lock duration

(define-constant err-no-lock-data (err u404)) ;; Error if lock data is not found

;; Example map for user lock data. The real implementation should link to the main contract.
(define-map user-lock-data principal
  { balance: uint, unlock-height: uint, deposit-height: uint }
)

;; Public function to calculate accrued interest for a user
;; @param user: The principal of the user whose interest is calculated
;; @return: The total accrued interest as uint, or an error if no lock data
(define-public (calculate-accrued-interest (user principal))
  (let
    ((user-data (map-get? user-lock-data user)))
    (match user-data data
      (let
        ((balance (get balance data))
         (lock-duration (- (get unlock-height data) (get deposit-height data)))
         (user-rate (contract-call? .interest-settings get-interest-rate user))
         (accrued-interest (/ (* balance user-rate lock-duration) u36500))) ;; 36500 accounts for daily compounding
        (ok accrued-interest)
      )
      err-no-lock-data
    )
  )
)

;; Read-only function to estimate accrued interest without actual transfer
;; @param user: The principal of the user
;; @return: The estimated interest
(define-read-only (estimate-interest (user principal))
  (let
    ((user-data (map-get? user-lock-data user)))
    (match user-data data
      (let
        ((balance (get balance data))
         (lock-duration (- (get unlock-height data) (get deposit-height data)))
         (user-rate (contract-call? .interest-settings get-interest-rate user))
         (estimated-interest (/ (* balance user-rate lock-duration) u36500)))
        estimated-interest
      )
      u0
    )
  )
)
