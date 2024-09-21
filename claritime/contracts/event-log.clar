;; Time-locked Wallet Contract - Events and Logging

(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-unlocked (err u101))
(define-constant err-invalid-amount (err u102))

(define-data-var event-counter uint u0)
(define-map user-wallets principal
  { balance: uint, unlock-height: uint }
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
        { balance: u0, unlock-height: u0 } 
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
        unlock-height: (get unlock-height current-wallet)
      }
    )
    (try!
      (emit-event "deposit" tx-sender amount)
    )
    (ok true)
  )
)

;; Set unlock height function
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
    (try!
      (emit-event "set-unlock-height" tx-sender height)
    )
    (ok true)
  )
)

;; Withdraw function
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
    (try!
      (as-contract
        (stx-transfer?
          amount tx-sender tx-sender
        )
      )
    )
    (try!
      (emit-event "withdraw" tx-sender amount)
    )
    (ok true)
  )
)

;; Read-only functions

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

(define-read-only (get-event-counter)
  (var-get event-counter)
)
