;; Transaction Summary for Time-locked Wallet
;; This contract provides functions to retrieve filtered or full transaction summaries for each user

(define-constant err-no-transactions (err u404))
(define-constant err-invalid-type (err u400))

;; Valid transaction types to filter by
(define-data-var valid-types (list 4 (string-ascii 20)) (list "deposit" "withdrawal" "penalty" "interest"))

;; Public function to check if a given transaction type is valid
;; @param tx-type: The transaction type to validate
;; @return: true if valid, false otherwise
(define-private (is-valid-type (tx-type (string-ascii 20)))
  (is-some (find (lambda (x) (is-eq x tx-type)) (var-get valid-types)))
)

;; Public function to retrieve a transaction summary filtered by type
;; @param user: The principal of the user whose transactions are being queried
;; @param tx-type: The type of transactions to include in the summary
;; @return: List of transactions matching the specified type or an error if type is invalid
(define-public (get-summary-by-type (user principal) (tx-type (string-ascii 20)))
  (begin
    ;; Validate transaction type
    (if (is-valid-type tx-type)
      (let ((tx-count (default-to u0 (map-get? transaction-counter user))))
        (if (is-eq tx-count u0)
          err-no-transactions
          (ok (filter
                (lambda (entry)
                  (is-eq (get tx-type entry) tx-type)
                )
                (map-to-list transaction-history user)
              )
          )
        )
      )
      err-invalid-type
    )
  )
)

;; Public function to retrieve all transactions for a user
;; @param user: The principal of the user whose transaction history is being queried
;; @return: List of all transactions for the user or error if no transactions exist
(define-public (get-all-transactions (user principal))
  (let ((tx-count (default-to u0 (map-get? transaction-counter user))))
    (if (is-eq tx-count u0)
      err-no-transactions
      (ok (map-to-list transaction-history user))
    )
  )
)
