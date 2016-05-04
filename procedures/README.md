Procedures includes all the capabilities of the API. Adapters (Lambda) parse
requests and authenticate the caller before invoking a procedure to run its
business logic. Adapters should perform authentication, but procedures perform
authorization. When complete, adapters format the procedure's response and pass
it back to the caller.
