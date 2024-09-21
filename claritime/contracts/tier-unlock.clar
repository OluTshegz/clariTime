;; Time-locked Wallet Contract - Tiered Unlock System

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-unlocked (err u101))
(define-constant err-invalid-amount (err u102))

(define-map user-wallets principal
  { balance: uint,
    tiers: (list 10 { amount: uint, unlock-height: uint } )
  }
)

(define-public (deposit (amount uint) )
  (let
    ((current-wallet
      (default-to
        { balance: u0, tiers: (list) } 
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
        tiers: (get tiers current-wallet)
      }
    )
    (ok true)
  )
)

(define-public (add-tier (amount uint) (unlock-height uint) )
  (let
    ((current-wallet
      (default-to
        { balance: u0, tiers: (list) }
          (map-get?
            user-wallets tx-sender
          )
      )
    ))
    (asserts!
      (> amount u0) err-invalid-amount
    )
    (asserts!
      (> unlock-height block-height) err-invalid-amount
    )
    (map-set user-wallets tx-sender 
      { balance: (get balance current-wallet), 
        tiers: 
          (unwrap!
            (as-max-len? 
              (append (get tiers current-wallet)
                (list { amount: amount, unlock-height: unlock-height } )
              ) u10
            ) err-owner-only
          )
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
    ) (withdrawable-amount
        (fold check-and-sum-tiers
          (get tiers current-wallet) u0
        )
      )
    )
    (asserts!
      (> withdrawable-amount u0) err-not-unlocked
    )
    (map-set user-wallets tx-sender 
      { balance: (- (get balance current-wallet) withdrawable-amount), 
        tiers: 
          (filter is-tier-not-withdrawable
            (get tiers current-wallet)
          )
      }
    )
    (as-contract
      (stx-transfer?
        withdrawable-amount tx-sender tx-sender
      )
    )
  )
)

(define-private
  (check-and-sum-tiers
    (tier { amount: uint, unlock-height: uint } )
    (sum uint)
  )
  (if (>= block-height (get unlock-height tier) )
        (+ sum (get amount tier))
    sum
  )
)

(define-private
  (is-tier-not-withdrawable
    (tier { amount: uint, unlock-height: uint } )
  )
  (< block-height (get unlock-height tier) )
)

(define-read-only (get-balance (user principal) )
  (default-to u0
    (get balance
      (map-get?
        user-wallets user
      )
    )
  )
)

(define-read-only (get-tiers (user principal) )
  (default-to
    (list)
      (get tiers
        (map-get?
          user-wallets user
        ) 
      )
  )
)
