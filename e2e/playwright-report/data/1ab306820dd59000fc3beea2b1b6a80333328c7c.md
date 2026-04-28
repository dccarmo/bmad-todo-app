# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: mobile.spec.ts >> mobile layout: input, list, and buttons are visible and functional at 375px
- Location: mobile.spec.ts:20:5

# Error details

```
Error: apiRequestContext.get: connect ECONNREFUSED ::1:80
Call log:
  - → GET http://localhost/api/v1/todos
    - user-agent: Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/26.4 Mobile/14E304 Safari/602.1
    - accept: */*
    - accept-encoding: gzip,deflate,br

```
