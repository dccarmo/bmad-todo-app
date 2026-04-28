# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: returning-user.spec.ts >> returning user sees previously created todos on reload
- Location: returning-user.spec.ts:12:5

# Error details

```
Error: apiRequestContext.get: connect ECONNREFUSED ::1:80
Call log:
  - → GET http://localhost/api/v1/todos
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.15 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br

```
