;; Time-locked Wallet Contract - Emergency Withdrawal

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-unlocked (err u101))
(define-constant err-invalid-amount (err u102))
(define-constant penalty-rate u10) ;; 10% penalty

(define-map user-wallets principal
  { balance: uint, unlock-height: uint }
)

(define-public (deposit (amount uint))
  (let
    ((current-wallet
      (default-to
        { balance: u0, unlock-height: u0 } 
          (map-get?
            user-wallets tx-sender
          )
      )
    ))
    (asserts!
      (> amount u0) err-invalid-amount
    )
    (try!
      (stx-transfer?
        amount tx-sender (as-contract tx-sender)
      )
    )
    (map-set user-wallets tx-sender 
      { balance: (+ (get balance current-wallet) amount), 
        unlock-height: (get unlock-height current-wallet)
      }
    )
    (ok true)
  )
)

(define-public (set-unlock-height (height uint))
  (let
    ((current-wallet
      (default-to
        { balance: u0, unlock-height: u0 } 
          (map-get?
            user-wallets tx-sender
          )
      )
    ))
    (asserts!
      (> height block-height) err-invalid-amount
    )
    (map-set user-wallets tx-sender 
      { balance: (get balance current-wallet), 
        unlock-height: height
      }
    )
    (ok true)
  )
)

(define-public (withdraw (amount uint))
  (let
    ((current-wallet
      (unwrap!
        (map-get?
          user-wallets tx-sender
        ) err-owner-only
      )
    ))
    (asserts!
      (>= block-height
        (get unlock-height current-wallet)
      ) err-not-unlocked
    )
    (asserts!
      (> amount u0) err-invalid-amount
    )
    (asserts!
      (<= amount
        (get balance current-wallet)
      ) err-invalid-amount
    )
    (map-set user-wallets tx-sender 
      { balance: (- (get balance current-wallet) amount), 
        unlock-height: (get unlock-height current-wallet)
      }
    )
    (as-contract
      (stx-transfer?
        amount tx-sender tx-sender
      )
    )
  )
)

(define-public (emergency-withdraw (amount uint))
  (let
    ((current-wallet
      (unwrap!
        (map-get?
          user-wallets tx-sender
        ) err-owner-only
      )
    )
    (penalty (/ (* amount penalty-rate) u100))
    (withdrawal-amount (- amount penalty)))
    (asserts!
      (> amount u0) err-invalid-amount
    )
    (asserts!
      (<= amount
        (get balance current-wallet)
      ) err-invalid-amount
    )
    (map-set user-wallets tx-sender 
      { balance: (- (get balance current-wallet) amount), 
        unlock-height: (get unlock-height current-wallet)
      }
    )
    (try!
      (as-contract
        (stx-transfer?
          withdrawal-amount tx-sender tx-sender
        )
      )
    )
    (try!
      (as-contract
        (stx-transfer?
          penalty contract-owner tx-sender
        )
      )
    )
    (ok withdrawal-amount)
  )
)

(define-read-only (get-balance (user principal))
  (default-to u0
    (get balance
      (map-get?
        user-wallets user
      )
    )
  )
)

(define-read-only (get-unlock-height (user principal))
  (default-to u0
    (get unlock-height
      (map-get?
        user-wallets user
      )
    )
  )
)
