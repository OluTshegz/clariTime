;; Time-locked Wallet Contract - Integrated Version

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-unlocked (err u101))
(define-constant err-invalid-amount (err u102))
(define-constant err-no-funds-available (err u103))
(define-constant penalty-rate u10) ;; 10% penalty
(define-constant interest-rate u5) ;; 5% annual interest (in basis points)

(define-data-var event-counter uint u0)

(define-map user-wallets principal 
  { balance: uint, 
    tiers:
      (list 10
        { amount: uint, unlock-height: uint }
      ),
    deposit-height: uint
  }
)

;; Event emission function
(define-private
  (emit-event
    (event-type (string-ascii 20))
    (user principal)
    (amount uint)
  )
  (let
    ((event-id
      (var-get event-counter)
    ))
    (print
      { event: event-type, id: event-id, user: user, amount: amount }
    )
    (var-set
      event-counter (+ event-id u1)
    )
    (ok true)
  )
)

;; Deposit function
(define-public (deposit (amount uint))
  (let
    ((current-wallet
      (default-to
        { balance: u0, tiers: (list), deposit-height: u0 } 
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
        tiers: (get tiers current-wallet),
        deposit-height: block-height
      }
    )
    (try!
      (emit-event "deposit" tx-sender amount)
    )
    (ok true)
  )
)

;; Add tier function
(define-public
  (add-tier
    (amount uint)
    (unlock-height uint)
  )
  (let
    ((current-wallet
      (default-to
        { balance: u0, tiers: (list), deposit-height: u0 } 
          (map-get? user-wallets tx-sender)
      )
    ))
    (asserts!
      (> amount u0) err-invalid-amount
    )
    (asserts!
      (> unlock-height block-height) err-invalid-amount
    )
    (asserts!
      (<= amount
        (get balance current-wallet)
      ) err-invalid-amount
    )
    (map-set user-wallets tx-sender 
      (merge current-wallet
        { balance: (- (get balance current-wallet) amount),
          tiers:
            (unwrap!
              (as-max-len? 
                (append
                  (get tiers current-wallet)
                    (list
                      { amount: amount, unlock-height: unlock-height }
                    )
                ) u10
              ) err-owner-only
            )
        }
      )
    )
    (try!
      (emit-event "add-tier" tx-sender amount)
    )
    (ok true)
  )
)

;; Withdraw function
(define-public (withdraw)
  (let
    ((current-wallet
      (unwrap!
        (map-get?
          user-wallets tx-sender
        ) err-owner-only
      )
    )
    (withdrawable-amount
      (calculate-withdrawable-amount current-wallet)
    ))
    (asserts!
      (> withdrawable-amount u0) err-no-funds-available
    )
    (map-set user-wallets tx-sender 
      (merge current-wallet
        { balance: (- (get balance current-wallet) withdrawable-amount), 
          tiers:
            (filter is-tier-not-withdrawable
              (get tiers current-wallet)
            ),
          deposit-height: block-height
        }
      )
    )
    (try!
      (as-contract
        (stx-transfer?
          withdrawable-amount tx-sender tx-sender
        )
      )
    )
    (try!
      (emit-event "withdraw" tx-sender withdrawable-amount)
    )
    (ok withdrawable-amount)
  )
)

;; Emergency withdraw function
(define-public (emergency-withdraw (amount uint))
  (let
    ((current-wallet
      (unwrap!
        (map-get?
          user-wallets tx-sender
        ) err-owner-only
      )
    )
    (penalty
      (/ (* amount penalty-rate) u100)
    )
    (withdrawal-amount
      (- amount penalty)
    ))
    (asserts!
      (> amount u0) err-invalid-amount
    )
    (asserts!
      (<= amount
        (get balance current-wallet)
      ) err-invalid-amount
    )
    (map-set user-wallets tx-sender 
      (merge current-wallet
        { balance: (- (get balance current-wallet) amount) }
      )
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
    (try!
      (emit-event "emergency-withdraw" tx-sender withdrawal-amount)
    )
    (ok withdrawal-amount)
  )
)

;; Helper function to calculate withdrawable amount
(define-private
  (calculate-withdrawable-amount
    (wallet
      { balance: uint,
        tiers:
          (list 10
            { amount: uint, unlock-height: uint }
          ),
        deposit-height: uint
      }
    )
  )
  (let
    ((tiered-amount
      (fold check-and-sum-tiers
        (get tiers wallet) u0
      )
    )
    (non-tiered-amount
      (- (get balance wallet) (fold sum-tier-amounts (get tiers wallet) u0) )
    )
    (total-principal
      (+ tiered-amount non-tiered-amount)
    )
    (lock-duration
      (- block-height (get deposit-height wallet) )
    )
    (interest-amount
      (/
        (* total-principal interest-rate lock-duration) u36500
      )
    ))
    (+ total-principal interest-amount)
  )
)

;; Helper function to check and sum withdrawable tiers
(define-private
  (check-and-sum-tiers
    (tier
      { amount: uint, unlock-height: uint }
    )
    (sum uint)
  )
  (if
    (>= block-height
      (get unlock-height tier)
    )
    (+ sum (get amount tier)
  )
    sum
  )
)

;; Helper function to sum all tier amounts
(define-private
  (sum-tier-amounts
    (tier
      { amount: uint, unlock-height: uint }
    )
    (sum uint)
  )
  (+ sum (get amount tier) )
)

;; Helper function to check if a tier is not withdrawable
(define-private
  (is-tier-not-withdrawable
    (tier
      { amount: uint, unlock-height: uint }
    )
  )
  (< block-height
    (get unlock-height tier)
  )
)

;; Read-only functions

(define-read-only
  (get-balance
    (user principal)
  )
  (let
    ((wallet
      (unwrap!
        (map-get?
          user-wallets user
        ) 
          { balance: u0, tiers: (list), deposit-height: u0 }
      )
    ))
    (calculate-withdrawable-amount wallet)
  )
)

(define-read-only
  (get-tiers
    (user principal)
  )
  (default-to
    (list)
      (get tiers
        (map-get?
          user-wallets user
        )
      )
  )
)

(define-read-only
  (get-deposit-height 
    (user principal)
  )
  (default-to u0
    (get deposit-height
      (map-get?
        user-wallets user
      )
    )
  )
)

(define-read-only (get-event-counter)
  (var-get event-counter)
)
