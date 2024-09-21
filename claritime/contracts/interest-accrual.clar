;; Time-locked Wallet Contract - Interest Accrual

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-unlocked (err u101))
(define-constant err-invalid-amount (err u102))
(define-constant interest-rate u5) ;; 5% annual interest

(define-map user-wallets principal
  { balance: uint, unlock-height: uint, deposit-height: uint }
)

(define-public (deposit (amount uint))
  (let
    ((current-wallet
      (default-to
        { balance: u0, unlock-height: u0, deposit-height: u0 } 
          (map-get? user-wallets tx-sender)
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
        unlock-height: (get unlock-height current-wallet),
        deposit-height: block-height
      }
    )
    (ok true)
  )
)

(define-public (set-unlock-height (height uint))
  (let
    ((current-wallet
      (default-to
        { balance: u0, unlock-height: u0, deposit-height: u0 } 
          (map-get? user-wallets tx-sender)
      )
    ))
    (asserts!
      (> height block-height) err-invalid-amount
    )
    (map-set user-wallets tx-sender 
      { balance: (get balance current-wallet), 
        unlock-height: height,
        deposit-height: (get deposit-height current-wallet)
      }
    )
    (ok true)
  )
)

(define-public (withdraw)
  (let
    ((current-wallet
      (unwrap!
        (map-get?
          user-wallets tx-sender
        ) err-owner-only
      )
    )
    (total-amount (calculate-total-amount current-wallet))
    )
    (asserts!
      (>= block-height
        (get unlock-height current-wallet)
      ) err-not-unlocked
    )
    (map-delete user-wallets tx-sender)
    (as-contract 
      (stx-transfer?
        total-amount tx-sender tx-sender
      )
    )
  )
)

(define-private
  (calculate-total-amount
    (wallet
      { balance: uint, unlock-height: uint, deposit-height: uint }
    )
  )
  (let
    ((lock-duration
      (- (get unlock-height wallet) (get deposit-height wallet) )
    )
    (interest-amount
      (/
        (* (get balance wallet) interest-rate lock-duration)
        u36500
      )
    ))
    (+ (get balance wallet) interest-amount)
  )
)

(define-read-only (get-balance (user principal))
  (let
    ((wallet
      (unwrap!
        (map-get?
          user-wallets user
        ) { balance: u0, unlock-height: u0, deposit-height: u0 }
      )
    ))
    (calculate-total-amount wallet)
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
