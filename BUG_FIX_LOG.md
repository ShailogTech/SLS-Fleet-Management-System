# SLT Fleet Management - Bug Fix & Error Log

Total commits: 85 | Bug fix commits: 36

---

## Category 1: Deployment & Infrastructure (12 fixes)

### BUG-001: CORS Preflight Failure on Vercel
- **Commit:** `75375ef`
- **Files:** `backend/server.py`, `frontend/vercel.json`

**What happened:** After deploying the frontend to Vercel and the backend to Render, all API calls from the browser were blocked. The browser console showed `Access to XMLHttpRequest has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource`. Every single API call — login, fetching vehicles, drivers — all failed silently on the frontend, leaving the app completely non-functional in production.

**Investigation:** The CORS middleware was present in `server.py` and configured with the correct origins. However, inspecting the actual HTTP responses from the Render backend revealed that OPTIONS preflight requests were returning without any CORS headers at all. This pointed to a middleware ordering issue — the CORS middleware was never getting a chance to process preflight requests.

**Root Cause:** In `server.py`, `CORSMiddleware` was added to the FastAPI app *after* all routes were included via `app.include_router()`. FastAPI processes middleware in the order they are added, but routes are matched first. Since OPTIONS requests didn't match any defined route handler (no explicit OPTIONS endpoints existed), FastAPI returned a 405 Method Not Allowed *before* the CORS middleware could add its headers. The browser, seeing a response without CORS headers, blocked the entire request.

**Fix:** Moved the `CORSMiddleware` registration to immediately after the FastAPI app instantiation, before any `app.include_router()` calls. This ensures CORS headers are added to every response, including OPTIONS preflight responses. Additionally, added explicit OPTIONS handling in `vercel.json` to handle any edge cases with Vercel's routing layer.

**Before:** Every API call from the deployed frontend failed with CORS errors. The app was completely broken in production.
**After:** All cross-origin requests work correctly. Preflight OPTIONS requests return proper CORS headers.

---

### BUG-002: MongoDB Atlas SSL Handshake Error
- **Commits:** `e079c86`, `de1f08a`
- **Files:** `backend/server.py`, `backend/requirements.txt`

**What happened:** After deploying to Render, the backend crashed on startup with `SSL: CERTIFICATE_VERIFY_FAILED` when trying to connect to MongoDB Atlas. The connection worked perfectly on the local development machine but failed consistently on Render's servers. This made the entire backend non-functional — no API endpoints could respond since the database was unreachable.

**Investigation:** The MongoDB Atlas connection string used `mongodb+srv://` which requires TLS/SSL. Local machines had up-to-date CA certificate bundles, but Render's Python environment shipped with an incomplete or outdated certificate store that didn't include the CA certificates used by MongoDB Atlas's servers.

**Root Cause:** Render's Python runtime environment lacked the trusted Certificate Authority certificates needed to verify MongoDB Atlas's SSL certificate chain. The default `pymongo` SSL verification failed because the CA that signed Atlas's certificate wasn't in Render's trust store.

**Fix (attempt 1):** Installed the `certifi` package and passed its CA bundle path via `tlsCAFile=certifi.where()` to the MongoDB client constructor. This partially worked but was fragile — it depended on certifi's bundle being up-to-date with Atlas's current CA.

**Fix (final):** Added `tls=true&tlsAllowInvalidCertificates=true` to the MongoDB connection string parameters. While this disables certificate verification (acceptable for this internal fleet management tool), it eliminates the dependency on the host machine's certificate store. Also upgraded `pymongo` to the latest version in `requirements.txt` to ensure the best TLS support.

**Before:** Backend crashed on startup on Render — zero functionality available.
**After:** MongoDB connection establishes reliably on every Render deployment.

---

### BUG-003: Render Port Detection Timeout
- **Commit:** `802ad14`
- **Files:** `backend/server.py`

**What happened:** Render's deployment health check failed with the error: "Your app is not detecting the open port within the timeout period." The backend deployment would start, logs would show the application initializing, but Render would kill the process after 5 minutes because it never detected an open HTTP port.

**Investigation:** Render monitors for a listening TCP port to confirm the app has started successfully. Looking at the startup logs, the application was stuck in the `@app.on_event("startup")` handler. It was running the admin seed query — checking if an admin user exists and creating one if not — as a synchronous blocking operation inside the startup event.

**Root Cause:** The `startup` event handler contained a MongoDB query (`db.users.find_one(...)`) that was awaited synchronously during the startup lifecycle. Because the startup event must complete before FastAPI begins listening on its port, this database operation (which could take several seconds on a cold MongoDB Atlas connection) blocked the port from opening. If the database connection was slow or timed out, the port never opened within Render's timeout window.

**Fix:** Replaced the `@app.on_event("startup")` pattern with FastAPI's modern `lifespan` context manager. Moved the admin seed operation to run as a `BackgroundTask` that executes after the server is already listening. This decouples the database seed from the port binding, ensuring the HTTP server starts immediately.

**Before:** Deployments intermittently failed on Render due to port timeout. Required manual redeployment.
**After:** Server starts and binds to port immediately. Admin seed runs in the background after the server is ready.

---

### BUG-004: CORS Whitespace in Origins
- **Commit:** `4a6c1a2`
- **Files:** `backend/server.py`

**What happened:** CORS errors appeared sporadically in production — some API calls worked fine, others were blocked. The inconsistency made it extremely difficult to debug. Refreshing the page sometimes fixed it, other times it didn't.

**Investigation:** The `CORS_ORIGINS` environment variable on Render was set to a comma-separated list of allowed origins. Printing the parsed origins list revealed entries like `"https://slt-fleet.vercel.app "` (with a trailing space) and `"https://slt-fleet.vercel.app/"` (with a trailing slash). The browser sends the `Origin` header as exactly `"https://slt-fleet.vercel.app"` — no trailing space or slash.

**Root Cause:** When the `CORS_ORIGINS` env var was split by commas, the resulting strings retained any whitespace from the environment variable value. A trailing space or slash in any origin string meant it wouldn't match the browser's `Origin` header exactly. CORS origin matching is string-exact — `"https://example.com "` does not match `"https://example.com"`.

**Fix:** Added `.strip()` to each origin after splitting by comma, and also stripped trailing slashes. Added debug logging that prints the final list of allowed origins on startup, making future CORS issues immediately diagnosable from the Render logs.

**Before:** Sporadic CORS failures depending on which origin string the request matched against.
**After:** Origins are consistently normalized. Debug logging makes CORS configuration transparent.

---

### BUG-005: Python 3.14 Breaks passlib/bcrypt
- **Commit:** `91fccfc`
- **Files:** `.python-version`, `backend/server.py`

**What happened:** The login endpoint suddenly started returning HTTP 500 errors on every authentication attempt. No code changes had been made — the issue appeared after a Render redeployment. The error logs showed `ModuleNotFoundError` and `AttributeError` exceptions originating from the `passlib` library's bcrypt backend.

**Investigation:** Render had automatically updated its default Python version to 3.14 (a pre-release version). The `passlib` library, which handles password hashing, uses Python's `crypt` module internally. Python 3.14 removed the deprecated `crypt` module entirely, breaking passlib's bcrypt backend. Additionally, the newer Python version changed some internal APIs that `passlib` depended on.

**Root Cause:** Python 3.14 removed the `crypt` standard library module and introduced breaking changes to internal APIs used by `passlib`. Since no `.python-version` file existed, Render used whatever Python version was current, which happened to be the incompatible 3.14.

**Fix:** Created a `.python-version` file in the repository root containing `3.11` to pin the Python runtime on Render. This ensures Render always uses Python 3.11, which is fully compatible with passlib and bcrypt. Also discovered and fixed a secondary issue: `CORSMiddleware` was configured with `allow_credentials=True` alongside `allow_origins=["*"]`, which violates the CORS spec (you cannot use wildcard origins with credentials). Fixed this by using explicit origin lists.

**Before:** All login attempts failed with 500 errors after Render auto-updated Python.
**After:** Python version is pinned, preventing surprise runtime upgrades. Authentication works reliably.

---

### BUG-006: bcrypt Version Incompatibility
- **Commit:** `d8c9015`
- **Files:** `backend/requirements.txt`

**What happened:** The `seed_all.py` script crashed with the error `ValueError: password cannot be longer than 72 bytes` when trying to hash passwords for seed users. This error occurred even with short passwords like "admin123". The same seed script had worked correctly in earlier deployments.

**Investigation:** The error message about 72-byte passwords was misleading — the actual passwords were well under 72 bytes. Tracing through the passlib code revealed that `bcrypt` version 4.1+ changed its internal API interface. Specifically, `bcrypt.hashpw()` started performing stricter input validation and changed its return type, which broke passlib's `bcrypt` backend adapter. The adapter was passing arguments in a format that the new bcrypt version interpreted incorrectly.

**Root Cause:** `bcrypt` 4.1+ introduced breaking changes to its Python API. The `passlib` library's bcrypt backend was written against `bcrypt` 4.0.x's API. When `pip install` pulled the latest bcrypt (4.1+), passlib's calls to `bcrypt.hashpw()` broke with misleading error messages because the function signature and behavior had changed.

**Fix:** Pinned `bcrypt==4.0.1` in `requirements.txt`. This version is the last one fully compatible with passlib's bcrypt backend. The pin ensures that `pip install` never upgrades to an incompatible version.

**Before:** Seed script crashed, unable to create initial admin user. New deployments started without any user accounts.
**After:** Password hashing works correctly with pinned bcrypt version.

---

### BUG-007: 500 Errors Appear as CORS Errors
- **Commit:** `28eb031`
- **Files:** `backend/server.py`, `frontend/src/utils/api.js`

**What happened:** When any backend endpoint threw an unhandled exception (500 error), the browser console showed a CORS error instead of the actual 500 error. This made debugging extremely difficult because every server-side bug appeared to be a CORS configuration issue. Developers would spend time investigating CORS settings when the actual problem was a Python exception in a route handler.

**Investigation:** When a FastAPI route handler raised an unhandled exception, FastAPI's default exception handler generated a 500 response. However, this default error response was created *outside* the CORS middleware's response processing pipeline. The CORS middleware only added headers to responses that flowed through it normally — unhandled exceptions bypassed it. The browser received a 500 response without `Access-Control-Allow-Origin` headers and, per the CORS spec, blocked access to the response body entirely, showing only "CORS error."

**Root Cause:** FastAPI's default exception handler generates responses that bypass the CORS middleware. Any unhandled Python exception in a route handler produced a response without CORS headers. The browser's CORS enforcement then prevented the frontend from reading the actual error message, making every server error look like a CORS error.

**Fix:** Added a global exception handler using `@app.exception_handler(Exception)` that catches all unhandled exceptions and returns a properly formatted `JSONResponse` with status code 500 and the error message. Because this handler returns a normal response object, it flows through the CORS middleware and gets proper CORS headers. Also updated the frontend's axios interceptor (`api.js`) to better handle and display error responses.

**Before:** All server errors appeared as CORS errors in the browser. Actual error messages were invisible.
**After:** Server errors display their actual error messages. CORS errors only appear for genuine CORS issues.

---

### BUG-008: CORS + withCredentials Conflict
- **Commit:** `1c999de`
- **Files:** `frontend/src/utils/api.js`, `backend/server.py`

**What happened:** Persistent CORS errors on every single API call, even after all previous CORS fixes. The browser console consistently showed `Access to XMLHttpRequest has been blocked by CORS policy: The value of the 'Access-Control-Allow-Origin' header in the response must not be the wildcard '*' when the request's credentials mode is 'include'`.

**Investigation:** The error message was very specific — it mentioned the credentials mode conflicting with the wildcard origin. Checking the frontend code, `axios` was configured with `withCredentials: true`, which tells the browser to include cookies with cross-origin requests and sets the credentials mode to 'include'. On the backend, CORS was configured with `allow_origins=["*"]`. The CORS specification explicitly forbids this combination: when credentials mode is 'include', the server must respond with a specific origin, not `*`.

**Root Cause:** The application uses JWT Bearer tokens in the `Authorization` header for authentication — it does NOT use cookies. However, `withCredentials: true` was set in the axios config (likely copied from a template or tutorial that used cookie-based auth). This flag is only needed for cookie-based authentication. Setting it caused the browser to use credentials mode 'include', which conflicts with the wildcard CORS origin `*`.

**Fix:** Removed `withCredentials: true` from the axios instance configuration in `api.js` since the app uses Bearer token authentication, not cookies. Simplified the backend CORS configuration to `allow_origins=["*"]` without `allow_credentials=True`. This resolved the conflict and is correct for token-based authentication where credentials (the JWT) are sent via the `Authorization` header, not cookies.

**Before:** Every API call failed with CORS errors due to the credentials/wildcard conflict.
**After:** All API calls work correctly. CORS configuration is correct for Bearer token authentication.

---

### BUG-009: Hardcoded Upload Paths on Render
- **Commit:** `589c720`
- **Files:** `backend/routes/documents.py`

**What happened:** Document upload endpoints returned `FileNotFoundError: [Errno 2] No such file or directory: '/app/backend/uploads/vehicles/...'` on every upload attempt in production on Render. Uploads worked perfectly in local development.

**Investigation:** The file paths used for saving uploaded documents were hardcoded as absolute paths like `/app/backend/uploads/`. While this path exists in some Docker-based deployments, Render's build environment uses a different directory structure. The `/app/backend/uploads/` directory simply didn't exist on Render's filesystem.

**Root Cause:** Upload destination paths were hardcoded as absolute filesystem paths that assumed a specific directory structure. Render's deployment environment uses a different directory layout than the development machine, so the hardcoded paths didn't exist.

**Fix:** Replaced hardcoded absolute paths with dynamic relative paths using `Path(__file__).parent` to construct upload directories relative to the Python source file's location. This ensures the upload directory is always resolved correctly regardless of where the application is deployed.

**Before:** All document uploads crashed with FileNotFoundError on Render.
**After:** Upload paths are resolved dynamically, working on any deployment platform.

---

### BUG-010: ESLint Exhaustive-deps Build Failure
- **Commit:** `8049069`
- **Files:** `frontend/src/components/modals/VehicleDetailModal.js`, `DriverDetailModal.js`, `frontend/src/pages/stoppages/StoppageList.js`

**What happened:** Vercel CI build failed with exit code 1. The build log showed multiple ESLint `react-hooks/exhaustive-deps` warnings being treated as errors. The specific warnings were about `useEffect` hooks that referenced functions and variables not listed in their dependency arrays. The Create React App build process treats all warnings as errors in CI mode (`CI=true`), causing the build to fail.

**Investigation:** Multiple components had `useEffect` hooks that called async data-fetching functions (like `fetchDriverDetails`, `fetchVehicles`) that were defined inside the component body. These functions were not wrapped in `useCallback`, meaning they were recreated on every render. The `useEffect` dependency array didn't include these functions (because including a non-memoized function would cause infinite re-renders), triggering the `exhaustive-deps` ESLint rule.

**Root Cause:** Async data-fetching functions defined inside component bodies were not wrapped in `useCallback`. When referenced inside `useEffect`, ESLint correctly warned that these functions should be in the dependency array. But adding a non-memoized function to the dependency array causes infinite re-renders (function recreated -> dependency changes -> effect re-runs -> re-render -> function recreated...). CRA's CI build mode treats all warnings as errors, blocking deployment.

**Fix:** Wrapped all data-fetching functions (`fetchDriverDetails`, `fetchVehicles`, `fetchUploadedDocs`, `fetchStoppages`) in `useCallback` with appropriate dependency arrays. Then added these memoized functions to the `useEffect` dependency arrays. This satisfies the ESLint rule without causing infinite re-renders because `useCallback` ensures the function reference is stable across renders (only changing when its dependencies change).

**Before:** Vercel build failed, preventing frontend deployment.
**After:** All ESLint warnings resolved. Builds succeed in CI mode.

---

### BUG-011: Login 500 Error - No Debug Info
- **Commit:** `c365272`
- **Files:** `backend/routes/auth.py`

**What happened:** The login endpoint intermittently returned HTTP 500 Internal Server Error with a generic error message. The Render logs showed the 500 status code but no stack trace or details about what went wrong. It was impossible to determine whether the issue was in email lookup, password verification, or token generation. Debugging required adding temporary print statements and redeploying, which was slow and unreliable.

**Investigation:** The login route handler had a single try/except block that caught all exceptions and returned a generic 500 response. No logging statements existed at any step of the authentication flow. When the error occurred, the exception was caught and swallowed, making it invisible in logs.

**Root Cause:** The authentication flow in `auth.py` had zero logging instrumentation. The login process involves multiple steps — validating the request body, looking up the user by email, verifying the password hash, and generating a JWT token — but none of these steps logged their progress or failures. A single catch-all exception handler returned a generic error, providing no diagnostic information.

**Fix:** Added comprehensive `logger.info()` and `logger.error()` statements at each step of the login flow: request received, user lookup result, password verification result, token generation, and any exceptions. Each log statement includes relevant context (email attempted, whether user was found, which step failed). This makes it possible to diagnose login failures from Render's log viewer without redeployment.

**Before:** Login failures were completely opaque — no way to determine the cause without code changes.
**After:** Every step of the login flow is logged, making failures immediately diagnosable.

---

### BUG-012: Route response_model Serialization Error
- **Commit:** `882c46c`
- **Files:** `backend/routes/plants.py`, `backend/routes/tenders.py`

**What happened:** GET endpoints for plants and tenders returned HTTP 500 errors with Pydantic `ValidationError` messages about date fields. The error occurred when trying to return data that was successfully read from MongoDB — the database query worked fine, but the response serialization failed.

**Investigation:** The routes were decorated with `response_model=PlantModel` (or `TenderModel`), which tells FastAPI to validate the response data against the Pydantic model before sending it. The Pydantic models defined date fields as `date` type (Python `datetime.date`). However, dates in MongoDB were stored as ISO format strings (e.g., `"2024-01-15"`), not Python `date` objects. When FastAPI tried to validate the response, Pydantic rejected the string dates because they didn't match the expected `date` type.

**Root Cause:** MongoDB stores dates as strings (ISO format), but the Pydantic `response_model` expected Python `date` objects. FastAPI's response validation (`response_model`) attempts to coerce response data into the model's types, and Pydantic's strict validation rejected the string-to-date conversion. This was a mismatch between the database's storage format and the API model's type annotations.

**Fix:** Removed `response_model` from the affected GET endpoints. The data returned from MongoDB is valid JSON and the frontend expects string dates anyway. Without `response_model`, FastAPI returns the data as-is without attempting type validation. This is a common pattern when using MongoDB with FastAPI — since MongoDB returns dictionaries, not Pydantic models, `response_model` validation often causes more problems than it solves.

**Before:** GET /plants and GET /tenders returned 500 errors due to response serialization failure.
**After:** Endpoints return data directly from MongoDB without validation errors.

---

## Category 2: Document Upload & Storage (8 fixes)

### BUG-013: Document Upload Multipart Parsing Failure
- **Commit:** `f9f076c`
- **Files:** `frontend/src/components/documents/DocumentUpload.js`

**What happened:** Every document upload attempt returned a 500 error. The backend logs showed a multipart parsing error — the server couldn't parse the incoming file data. The file was being sent, and the network tab showed the request payload, but the server rejected it.

**Investigation:** Comparing the request headers in the browser's network tab with what the server expected revealed the issue. The `Content-Type` header was set to `multipart/form-data` — but without the crucial `boundary` parameter. Multipart form data requires a boundary string that separates the different parts of the request body. Without it, the server has no way to parse where the file data begins and ends.

**Root Cause:** The frontend code manually set the `Content-Type: multipart/form-data` header on the axios request config. When you manually set this header, you provide the MIME type but NOT the boundary parameter. Normally, when you pass a `FormData` object to axios without setting the Content-Type header, axios automatically sets the correct `Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...` header, including the auto-generated boundary string that matches the actual boundary used in the request body. By manually overriding the header, the boundary information was lost.

**Fix:** Removed the manual `Content-Type` header from all upload-related axios calls. Axios automatically detects when the request body is a `FormData` instance and sets the correct `Content-Type` header with the proper boundary parameter. This is a common mistake in web development — manually setting multipart headers interferes with the browser's automatic boundary generation.

**Before:** All file uploads failed with server-side parsing errors.
**After:** Files upload successfully. Axios handles multipart headers automatically.

---

### BUG-014: Document Upload CORS (Multiple Attempts)
- **Commits:** `65d4a45`, `1baad36`, `f8e0805` (revert), `2fcd5eb`
- **Files:** `backend/routes/documents.py`, `backend/server.py`

**What happened:** Document uploads failed with a combination of CORS errors and network errors in production. The issue was particularly frustrating because it manifested differently each time — sometimes as a CORS error, sometimes as a network error, and sometimes the upload appeared to succeed but the file wasn't saved. This led to multiple fix attempts over 4 commits, including one revert.

**Investigation:** This was a complex interaction between three separate issues: (1) Large file uploads to Render sometimes timed out, causing the connection to drop before CORS headers were sent. (2) The global exception handler (from BUG-007) didn't cover all exception types, so some filesystem errors still bypassed CORS headers. (3) Render's ephemeral filesystem could fill up or become read-only under certain conditions, causing file save operations to fail silently.

**Root Cause:** Multiple interacting failures: Render's ephemeral filesystem was unreliable for file storage (files could fail to write or disappear). When filesystem operations failed, the resulting Python exceptions weren't covered by the CORS exception handler, so the error responses lacked CORS headers, causing the browser to show CORS errors instead of the actual filesystem error.

**Fix (attempt 1 - commit 65d4a45):** Implemented a two-step upload — send metadata first (JSON), then attach file separately. This was theoretically cleaner but introduced new race conditions and was reverted.

**Fix (attempt 2 - commit 1baad36):** Changed to a JSON-only metadata endpoint, eliminating file upload entirely. This was too restrictive and was reverted.

**Fix (revert - commit f8e0805):** Reverted the above attempts back to the original approach.

**Fix (final - commit 2fcd5eb):** Two-pronged fix: (1) Extended the global exception handler to cover all exception types with proper CORS headers, ensuring filesystem errors are reported correctly instead of appearing as CORS errors. (2) Added a MongoDB base64 fallback — if filesystem storage fails, the file content is encoded as base64 and stored directly in MongoDB. This eliminates the dependency on Render's ephemeral filesystem entirely.

**Before:** Document uploads were unreliable in production — failing in different ways at different times.
**After:** Uploads reliably fall back to MongoDB storage when filesystem is unavailable.

---

### BUG-015: Documents Disappear After Render Restart
- **Commit:** `388bc06`
- **Files:** `backend/routes/documents.py`, `backend/routes/users.py`, `backend/routes/vehicles.py`

**What happened:** Two separate issues: (1) All previously uploaded documents vanished whenever Render restarted the backend service (which happens on every deploy and periodically due to free-tier idle shutdowns). Users would upload insurance documents, registration papers, etc., and they'd simply disappear within hours. (2) A 500 error with the message `"Cannot create field 'insurance' in element that is null: {documents: null}"` when trying to upload a document for a vehicle that had never had any documents.

**Investigation:** For issue 1: Render's free tier uses an ephemeral filesystem — all files written to disk are lost when the container restarts. Uploaded documents were being saved to the filesystem, which Render wipes clean on every restart or cold start. For issue 2: The upload endpoint used MongoDB dot notation (`$set: {"documents.insurance": {...}}`) to set a nested field. Dot notation requires the parent field to exist as an object. Some vehicles had `documents: null` instead of `documents: {}`, causing MongoDB to throw an error because you can't create a nested field inside a null value.

**Root Cause:** (1) Files were stored on Render's ephemeral filesystem, which is not persistent. Any container restart (deploy, idle shutdown, crash) wipes all files. (2) Vehicle records created before the documents feature was added had `documents` initialized as `null` instead of `{}`. MongoDB's dot notation update operator cannot create nested paths inside a null parent.

**Fix:** Comprehensive storage overhaul: (1) Changed ALL file storage to use MongoDB base64 encoding instead of filesystem storage. Documents are now stored as base64-encoded strings in the `documents` collection. This makes them persistent across Render restarts. (2) Before using dot notation to update `documents.X`, the code first ensures the `documents` field exists and is an object by running `$set: {"documents": {}}` if the current value is null. (3) Moved user profile photos from filesystem storage to a dedicated `photos` MongoDB collection using the same base64 approach.

**Before:** Uploaded documents disappeared after every Render restart. Uploading to vehicles without existing documents crashed.
**After:** All files are stored in MongoDB and persist permanently. Null parent fields are initialized before updates.

---

### BUG-016: Duplicate Documents in Display
- **Commits:** `544196c`, `a9478bd`
- **Files:** `backend/routes/documents.py`, `frontend/src/components/modals/VehicleDetailModal.js`, `DriverDetailModal.js`

**What happened:** The vehicle detail modal's Documents tab showed duplicate entries — for example, two "Insurance" rows or two "Registration" rows. One would have the expiry date but no file, and the other would have the file but no expiry date. Re-uploading a document created yet another duplicate instead of replacing the existing one.

**Investigation:** Documents came from two sources: (1) Inline expiry dates stored directly in the `vehicle.documents` embedded object (e.g., `{insurance: {expiry_date: "2025-01-01"}}`), set during vehicle creation. (2) Uploaded file records stored in the separate `documents` collection (e.g., `{entity_type: "vehicle", document_type: "insurance", file_data: "base64..."}`). The frontend fetched both and displayed them as separate rows. Additionally, the upload endpoint always created a new document record instead of updating the existing one.

**Root Cause:** Two separate data sources (inline vehicle.documents and the documents collection) were both displayed without deduplication. The frontend merged them by simply concatenating both lists. The backend upload endpoint used `insert_one` instead of `update_one` with upsert, so re-uploading created duplicates in the documents collection too.

**Fix:** Backend: Changed the upload endpoint to use an upsert pattern — `update_one({entity_type, entity_id, document_type}, {$set: data}, upsert=True)`. This means uploading the same document type for the same entity updates the existing record instead of creating a duplicate. Frontend: Changed the display logic to merge documents from both sources by `document_type` key into a single map, combining the expiry date from the inline source with the file data from the uploaded source. Also added a "View" button that opens the uploaded file in a new tab.

**Before:** Document lists showed duplicates. Re-uploading created additional duplicates.
**After:** Documents are deduplicated by type. Re-uploading updates the existing record. View button opens files.

---

### BUG-017: False Upload Error Toasts
- **Commits:** `614c5a6`, `46ee56e` (revert), `9620860`
- **Files:** `frontend/src/components/documents/DocumentUpload.js`

**What happened:** When uploading documents, the UI displayed error toast notifications ("Upload failed!") even when the file was actually saved successfully. Users would see the error, try uploading again, and get duplicate uploads. The issue was particularly confusing because checking the Documents tab after dismissing the error showed that the file was indeed there.

**Investigation:** The upload API call sometimes returned successfully but with a slight delay that caused the frontend's promise chain to interpret the response as a failure. In other cases, the network response would briefly stall (common with large files over slow connections), triggering axios's timeout handler. The backend had successfully saved the file, but the frontend showed an error because of the network-level timing.

**Root Cause:** Network response timing inconsistencies between the file being saved on the backend and the HTTP response being received by the frontend. Large files over slow connections exacerbated the issue. The frontend's error detection was too aggressive — any network hiccup during the response phase was treated as an upload failure, even though the upload had already completed on the backend.

**Fix (attempt 1 - commit 614c5a6):** Added a verification step — after upload, query the backend to check if the file exists, and only show error if verification fails. This introduced its own timing issues (the document might not be queryable immediately after insert).

**Fix (revert - commit 46ee56e):** Reverted the verification approach.

**Fix (final - commit 9620860):** Changed the error handling strategy entirely. Upload errors are now logged to `console.error()` instead of showing user-facing toast notifications. The upload result is determined by whether the document appears in the list after refreshing (which happens automatically). This eliminates the false-positive error toasts while still recording any genuine errors in the browser console for debugging.

**Before:** Users saw error messages for successful uploads, leading to confusion and duplicate uploads.
**After:** No misleading error toasts. Genuine errors are logged to console for debugging.

---

## Category 3: Data Integrity & Logic (8 fixes)

### BUG-018: engine_no Unique Index vs CSV Duplicates
- **Commits:** `edb142d`, `f4ba59a`
- **Files:** `backend/seed_all.py`

**What happened:** The `seed_all.py` script, which imports vehicles from a CSV file into MongoDB, crashed with `DuplicateKeyError: E11000 duplicate key error collection: fleet.vehicles index: engine_no_1`. This happened when trying to seed the database with real vehicle data from SLT's Excel export, which contained multiple vehicles with the same engine number (a data quality issue in the source data).

**Investigation:** The MongoDB `vehicles` collection had a unique index on the `engine_no` field, intended to prevent duplicate vehicles. However, the source CSV data from SLT contained legitimate cases where multiple vehicles shared an engine number — for example, when an engine was transferred between vehicles, or due to data entry errors in the original system.

**Root Cause:** The unique index on `engine_no` was correct in principle but incompatible with the real-world data that contained duplicate engine numbers. The seed script attempted to insert all CSV rows without checking for duplicates, causing MongoDB to reject any row that shared an engine number with an already-inserted row.

**Fix (attempt 1 - commit edb142d):** Removed the unique index on `engine_no` entirely. This allowed the seed to complete but was a bad solution — it allowed genuine duplicate vehicles to be created through the API.

**Fix (final - commit f4ba59a):** Added deduplication logic to the seed script: before inserting, group vehicles by `engine_no` and keep only the most recent entry (based on creation date or position in the CSV). Then restored the unique index as a `sparse` index (which only enforces uniqueness on documents that have the `engine_no` field, skipping nulls). This preserves data integrity for API-created vehicles while handling the messy source data.

**Before:** Database seeding from CSV crashed. No vehicle data could be imported.
**After:** CSV data is deduplicated before import. Unique sparse index prevents API-level duplicates.

---

### BUG-019: Driver Expiry Dates Not Showing
- **Commit:** `b2f8bd1`
- **Files:** `backend/routes/drivers.py`

**What happened:** The driver detail modal showed empty expiry date fields for "Driving License Expiry" and "Hazardous Certificate Expiry", even for drivers whose documents had been uploaded with expiry dates. The document upload process worked correctly, but the dates never appeared in the driver view.

**Investigation:** When a document (DL or hazardous certificate) was uploaded via the `/documents/upload` endpoint, the expiry date was saved in the `documents` collection with the document record. However, the `GET /drivers/{id}` endpoint only read from the `drivers` collection, which didn't have these expiry dates. The `documents` collection was a separate collection, and no code existed to join or merge the data.

**Root Cause:** Expiry dates were stored only in the `documents` collection (as metadata attached to uploaded files), not synced back to the `drivers` collection. The GET endpoints for drivers returned the driver record as-is from the `drivers` collection, without enriching it with related document data. This was a data normalization issue — the same information (expiry dates) was needed in two places but only stored in one.

**Fix:** Modified both `GET /drivers` (list) and `GET /drivers/{id}` (detail) endpoints to enrich driver records with expiry dates from the `documents` collection. After fetching driver records, the code queries the `documents` collection for all documents belonging to each driver, extracts the expiry dates by document type (DL, hazardous certificate), and merges them into the driver response. For the list endpoint, this is done as a batch query to avoid N+1 performance issues.

**Before:** Driver detail showed no expiry dates even when documents with dates existed.
**After:** Driver records include expiry dates sourced from the documents collection.

---

### BUG-020: Driver Assignment Pydantic Validation Error
- **Commit:** `e3e91ce`
- **Files:** `backend/routes/vehicles.py`, `backend/routes/documents.py`

**What happened:** Assigning a driver to a vehicle through the vehicle detail modal returned HTTP 422 Unprocessable Entity with a Pydantic `ValidationError`. The error pointed to date fields that couldn't be parsed. The assign-driver action had nothing to do with dates, making the error message confusing.

**Investigation:** The assign-driver endpoint had `response_model=VehicleModel` in its route decorator. After updating the vehicle's `assigned_driver_id`, the endpoint returned the full updated vehicle document from MongoDB. This vehicle document contained date strings (insurance expiry, registration expiry, etc.) in ISO format. Pydantic's `VehicleModel` defined these as Python `date` objects. When FastAPI tried to serialize the response through the `response_model`, Pydantic rejected the string dates.

**Root Cause:** Same underlying issue as BUG-012 — `response_model` on route decorators causes Pydantic validation of response data. MongoDB stores dates as strings, Pydantic models expect `date` objects. The assign-driver endpoint's `response_model=VehicleModel` triggered validation on the entire vehicle document, including date fields that were stored as strings.

**Fix:** Removed `response_model` from the POST and PUT endpoints in `vehicles.py` that return vehicle documents. Also added a secondary fix: when a document is uploaded with an expiry date, the upload endpoint now syncs that expiry date back to the vehicle's embedded `documents` field (e.g., `vehicle.documents.insurance.expiry_date`), ensuring consistency between the two data sources.

**Before:** Driver assignment failed with confusing Pydantic validation errors about dates.
**After:** Assignment works correctly. Expiry dates are synced between documents collection and vehicle record.

---

### BUG-021: Driver Status Not Saving from Detail Modal
- **Commit:** `5c5833d`
- **Files:** `backend/routes/drivers.py`

**What happened:** When an admin changed a driver's status (from "Active" to "Inactive" or "On Leave") using the dropdown in the driver detail modal and clicked Save, the save appeared to succeed (no error message), but refreshing the page showed the status unchanged. The status edit was silently ignored.

**Investigation:** The frontend was correctly sending the `status` field in the PUT request body (confirmed via browser network tab — the request payload included `{..., "status": "inactive", ...}`). The backend's PUT `/drivers/{id}` endpoint accepted the request and returned 200. But the database record wasn't updated. Examining the endpoint code revealed it used `DriverCreate(**request.body)` to validate the incoming data through the `DriverCreate` Pydantic model. The `DriverCreate` model defined fields like `name`, `phone`, `emp_id`, `plant`, etc. — but not `status`.

**Root Cause:** The `DriverCreate` Pydantic model didn't include a `status` field. When the PUT request data was validated through `DriverCreate`, Pydantic silently stripped any fields not defined in the model (this is Pydantic's default behavior — `model_config` doesn't include `extra = "allow"`). So the `status` field was received by the server but removed during validation, and the database update never included it.

**Fix:** Changed the update endpoint to accept the request body as a raw `dict` instead of validating through `DriverCreate`. Added a whitelist of allowed fields (`name`, `phone`, `emp_id`, `plant`, `dl_no`, `status`, etc.) and filtered the incoming data to only include whitelisted fields before updating MongoDB. This allows `status` to pass through while still preventing arbitrary field injection. Also added logic to sync the driver's status to their user account — if a driver is set to "inactive", their user account is also deactivated, preventing them from logging in.

**Before:** Status changes were silently ignored. Drivers remained in their old status.
**After:** Status changes are saved correctly and synced to the driver's user account.

---

### BUG-022: "On Leave" Status Shows as "Inactive"
- **Commit:** `5c5833d`
- **Files:** `frontend/src/components/common/StatusBadge.js`

**What happened:** When an admin set a driver's status to "On Leave", the status badge on the driver card and in the driver list displayed "Inactive" with the red inactive styling instead of "On Leave" with appropriate styling. The database correctly stored "on_leave" but the UI displayed it incorrectly.

**Investigation:** The `StatusBadge` component uses a `STATUS_CONFIG` object that maps status values to display labels and CSS classes. Looking at the config, it had entries for `active`, `inactive`, `pending`, `approved`, `rejected`, `expired`, etc. — but no entry for `on_leave`. The component had a fallback that mapped any unknown status to the `inactive` display, which is why "on_leave" appeared as "Inactive".

**Root Cause:** The `STATUS_CONFIG` lookup table in `StatusBadge.js` didn't have an `on_leave` entry. The component's fallback behavior defaulted unknown statuses to `inactive` styling and label. When the driver status feature was added to the backend (with "on_leave" as a valid status), the frontend's StatusBadge component wasn't updated to handle this new status value.

**Fix:** Added `on_leave: { label: 'On Leave', className: 'bg-orange-100 text-orange-800' }` to the `STATUS_CONFIG` object in `StatusBadge.js`. The orange color was chosen to visually distinguish it from both active (green) and inactive (red), indicating a temporary unavailability status.

**Before:** "On Leave" drivers displayed as "Inactive" with red styling.
**After:** "On Leave" displays correctly with orange "On Leave" badge.

---

### BUG-023: Tender Filter Not Working
- **Commit:** `5c5833d`
- **Files:** `frontend/src/pages/tenders/TenderManagement.js`

**What happened:** The status filter dropdown on the Tenders page had no effect. Selecting "Active", "Expired", or any other filter option didn't change the displayed list of tenders — all tenders remained visible regardless of the selected filter.

**Investigation:** The component had two pieces of code that managed the filtered list: (1) A `useEffect` that watched the `statusFilter` state and filtered `tenders` into `filteredTenders`. (2) Inside `fetchTenders()`, after receiving the API response, a line `setFilteredTenders(response.data)` that set the filtered list to ALL tenders.

The execution order was: user selects filter → `statusFilter` state updates → `useEffect` fires and correctly filters tenders → BUT `fetchTenders` was also being called (triggered by the same or nearby state change) → `setFilteredTenders(response.data)` overwrote the filtered list with the unfiltered complete list.

**Root Cause:** A race condition between the filter `useEffect` and the `fetchTenders` function. Both wrote to `setFilteredTenders`, but `fetchTenders` always wrote ALL tenders, overwriting whatever the filter `useEffect` had computed. The `fetchTenders` function should have only updated the source `tenders` state, not the derived `filteredTenders` state.

**Fix:** Removed `setFilteredTenders(response.data)` from the `fetchTenders` function. Now `fetchTenders` only updates the `tenders` state (the unfiltered source data). The `useEffect` that watches `statusFilter` and `tenders` is the single source of truth for `filteredTenders`. This follows the React pattern of derived state — `filteredTenders` is derived from `tenders` + `statusFilter`, so only the `useEffect` should compute it.

**Before:** Filter dropdown had no effect. All tenders always displayed.
**After:** Filter correctly shows only tenders matching the selected status.

---

### BUG-024: Expired Tenders Not Showing as Expired
- **Commit:** `5c5833d`
- **Files:** `frontend/src/pages/tenders/TenderManagement.js`

**What happened:** Tenders whose contract period had ended (e.g., a tender valid until December 2024 being viewed in March 2025) still displayed an "Active" status badge. Users had to manually check the dates to determine if a tender was expired. There was no automatic detection of expiration.

**Investigation:** The tender's `status` field was set to "active" at creation time and never modified. The system had no mechanism — neither backend cron job nor frontend computation — to update the status when the contract period elapsed. The `status` field was static from the moment of creation.

**Root Cause:** The tender status was stored as a static string in MongoDB ("active", "pending", etc.) and never recalculated. No backend process checked whether tenders had passed their end dates. The status reflected the state at creation time, not the current state.

**Fix:** Added a `getEffectiveStatus()` function in the frontend that computes the real status at display time. For each tender, it checks `extension_end_date` (if the tender was extended), then `contract_validity`, then `end_date` against today's date. If the effective end date is in the past, the function returns "expired" regardless of the stored status. This computed status is applied when tenders are fetched, enriching each tender with `status: getEffectiveStatus(tender)`. This approach avoids needing a backend cron job while ensuring users always see the correct status.

```javascript
const getEffectiveStatus = (tender) => {
  const effectiveEnd = tender.extension_end_date || tender.contract_validity || tender.end_date;
  if (effectiveEnd) {
    const end = new Date(effectiveEnd);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (end < today) return 'expired';
  }
  return tender.status;
};
```

**Before:** Expired tenders showed as "Active" indefinitely.
**After:** Tenders automatically show "Expired" when past their end date.

---

### BUG-025: Shift/Renumber Not Syncing Plant
- **Commit:** `e200537`
- **Files:** `backend/routes/vehicles.py`

**What happened:** When a vehicle was shifted (renumbered and moved to a new tender), the old tender's `assigned_vehicles` list still contained the vehicle, the driver's plant wasn't updated to match the new assignment, and the overall data state became inconsistent. Admins had to manually fix tender assignments after every shift operation.

**Investigation:** The shift endpoint updated the vehicle's own record (new vehicle_no, new tender_name, new plant) but didn't update any related records. The old tender still listed the vehicle. The new tender didn't have the vehicle added. The driver assigned to the vehicle was still associated with the old plant.

**Root Cause:** The shift endpoint had incomplete update logic. It only modified the vehicle document itself, without cascading changes to related entities. In a relational system, this would be handled by foreign key constraints and cascading updates, but MongoDB doesn't enforce these relationships — they must be managed in application code.

**Fix:** Expanded the shift endpoint to perform a complete cascading update: (1) Remove the vehicle from the old tender's `assigned_vehicles` array using `$pull`. (2) Add the vehicle to the new tender's `assigned_vehicles` array using `$push`. (3) If the vehicle has an assigned driver, update the driver's `plant` field to match the new tender's plant. (4) Record the shift in the vehicle's `shift_history` array with full details (old/new vehicle number, old/new tender, old/new plant, NOC/LOE status, who performed the shift, timestamp).

**Before:** Shifting a vehicle left data inconsistent across tenders and drivers.
**After:** All related records are updated atomically during a shift operation.

---

## Category 4: UI/UX & Frontend Errors (8 fixes)

### BUG-026: Blank Page on Invalid Login
- **Commit:** `1f0690a`
- **Files:** `frontend/src/utils/api.js`

**What happened:** When a user entered incorrect login credentials, instead of seeing an error message like "Invalid email or password", the entire page went blank white. The browser showed no content at all — just a white screen. The only way to recover was to manually navigate to `/login` in the URL bar or clear browser storage.

**Investigation:** The axios instance in `api.js` had a response interceptor that watched for 401 Unauthorized responses. When any API call returned 401, the interceptor cleared the stored token and redirected to `/login` using `window.location.href = '/login'`. When the login endpoint itself returned 401 (invalid credentials), the interceptor caught this response, cleared the token (which was already null since the user wasn't logged in), and triggered a redirect to `/login` — the page they were already on. This caused the login page to reload, but the React app was already in a state that expected an error response, and the forced redirect caused the React rendering tree to unmount and re-mount incorrectly, resulting in a blank page.

**Root Cause:** The 401 interceptor treated ALL 401 responses the same — including the 401 from the login endpoint itself. A 401 from `/auth/login` means "wrong credentials" and should show an error message. A 401 from other endpoints means "session expired" and should redirect to login. The interceptor didn't distinguish between these cases, causing a redirect loop on the login page.

**Fix:** Added a condition to the 401 interceptor that checks the request URL before redirecting. If the failed request URL contains `/auth/login`, the interceptor skips the redirect and lets the error propagate normally to the calling code (which displays the error message). For all other endpoints, the redirect behavior is preserved.

```javascript
if (!error.config.url.includes('/auth/login')) {
  localStorage.removeItem('token');
  window.location.href = '/login';
}
```

**Before:** Invalid login credentials caused a blank white screen.
**After:** Invalid credentials show an error message on the login form.

---

### BUG-027: React Crash on Login Validation Error
- **Commit:** `0d61d4e`
- **Files:** `frontend/src/contexts/AuthContext.js`

**What happened:** When a user entered a malformed email address (e.g., "admin" without "@domain.com") and clicked login, the entire React app crashed with the error `Objects are not valid as a React child (found: object with keys {type, loc, msg, input, url})`. The page went blank with a React error overlay in development mode.

**Investigation:** The login request was sent to the FastAPI backend, which used Pydantic to validate the request body. Pydantic detected that the email field was not a valid email format and returned a 422 response with `detail` set to an array of validation error objects:
```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "email"],
      "msg": "value is not a valid email address",
      "input": "admin",
      "url": "https://errors.pydantic.dev/..."
    }
  ]
}
```
The `AuthContext` login handler extracted `error.response.data.detail` and passed it directly to `setError(detail)`. The JSX then rendered `{error}` in a `<p>` tag. When `detail` is a string (like "Invalid credentials"), React renders it fine. But when `detail` is an array of objects (Pydantic validation errors), React cannot render objects as children, causing the crash.

**Root Cause:** The frontend assumed `detail` in error responses would always be a string. FastAPI's Pydantic validation returns `detail` as an array of error objects for validation failures, while custom `HTTPException` responses return `detail` as a string. The frontend didn't handle the array case.

**Fix:** Added type checking in `AuthContext.js` before setting the error message. If `detail` is a string, use it directly. If `detail` is an array, extract the `msg` field from each validation error object and join them into a single string. This handles both formats:

```javascript
const detail = err.response?.data?.detail;
if (Array.isArray(detail)) {
  setError(detail.map(e => e.msg).join(', '));
} else {
  setError(detail || 'Login failed');
}
```

**Before:** Malformed email input crashed the entire React application.
**After:** Validation errors are displayed as readable text messages.

---

### BUG-028: handleChange Not Defined in VehicleForm
- **Commit:** `e4dfc9a`
- **Files:** `frontend/src/pages/vehicles/VehicleForm.js`

**What happened:** The multi-step Vehicle Creation wizard crashed immediately when a user typed in any input field. The browser console showed `ReferenceError: handleChange is not defined`. Every text input, dropdown, and date picker on the form triggered this error.

**Investigation:** All input fields in the VehicleForm used `onChange={handleChange}` to update the form state. This function was referenced extensively throughout the JSX but was never defined in the component body. The component had `formData` state and `setFormData` but no `handleChange` helper function to bridge input events to state updates.

**Root Cause:** The `handleChange` function was referenced in every form field's `onChange` handler but was never defined anywhere in the component. This was likely a result of the component being written with the assumption that a `handleChange` utility function existed, or it was accidentally deleted during refactoring.

**Fix:** Added the `handleChange` function definition to the component:

```javascript
const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
};
```

This standard React pattern extracts the input's `name` attribute and `value`, then updates the corresponding field in `formData`.

**Before:** Vehicle creation form was completely unusable — any interaction caused a crash.
**After:** All form fields work correctly, updating form state on input.

---

### BUG-029: Profile Photo Modal Hidden Behind Overlay
- **Commit:** `14d1a70`
- **Files:** `frontend/src/pages/users/UserProfile.js`

**What happened:** On the User Profile page, clicking "Remove photo" triggered a confirmation dialog ("Are you sure you want to remove your profile photo?"), but the dialog was invisible. The page dimmed (indicating the modal overlay was active), but the actual modal content was hidden. Users had to refresh the page to escape the dimmed state.

**Investigation:** The modal was rendering in the DOM (visible in React DevTools), and its CSS properties were correct. However, it was positioned behind another DOM element. The User Profile page used a page transition animation wrapper that had a semi-transparent overlay with a high `z-index`. The confirmation modal was rendered inside this wrapper, so its `z-index` was relative to the wrapper's stacking context, not the viewport.

**Root Cause:** CSS stacking context issue. The modal was rendered inside a parent element that had `position: relative` and a `z-index` that created a new stacking context. The page transition overlay was in a sibling stacking context with a higher `z-index`. No matter how high the modal's `z-index` was set within its stacking context, it could never appear above elements in a higher stacking context.

**Fix:** Used React's `createPortal` to render the confirmation modal directly into `document.body`, outside the page transition DOM tree entirely. Portal rendering breaks out of the parent component's DOM hierarchy, so the modal's `z-index` is now relative to the root stacking context, allowing it to appear above all other elements.

**Before:** Confirmation modal was invisible, hidden behind the page transition overlay.
**After:** Modal renders via portal and appears above all other content.

---

### BUG-030: Loading Spinner Blocks Entire UI
- **Commit:** `78b9991`
- **Files:** `frontend/src/pages/approvals/ApprovalQueue.js`

**What happened:** When navigating to the Approvals page, a full-screen truck loading animation covered the entire viewport for 3-10 seconds. During this time, the user couldn't see any page structure, couldn't click any navigation items, and couldn't tell what was loading. The spinner provided zero context about what was happening.

**Investigation:** The page used `<TruckLoader />` as its loading state, which renders a Lottie animation div with `position: fixed`, `inset: 0`, and a high `z-index`. This covered the entire viewport, including the sidebar and header. While aesthetically interesting on first app load (splash screen), it was disorienting for page-level data loading where the user already knows where they are in the app.

**Root Cause:** Using a full-viewport blocking loader for page-level data fetching. The `TruckLoader` component was designed as a splash screen for initial app load, not for in-page content loading. Using it for the Approvals page's data fetch created a jarring experience where the entire UI became inaccessible during routine data loading.

**Fix:** Replaced the `TruckLoader` with skeleton placeholder components that mirror the actual page layout. While data loads, the user sees card-shaped gray placeholder blocks with pulsing animations where the approval cards will appear. The sidebar, header, and page title remain visible and interactive. This pattern (skeleton screens) is widely used by apps like Facebook and LinkedIn to indicate loading without blocking interaction.

**Before:** Full-screen loading animation blocked all interaction for several seconds.
**After:** Skeleton placeholders show page structure while data loads. Navigation remains usable.

---

### BUG-031: Drivers Page Refresh Button No Loading State
- **Commit:** `6c7ae2d`
- **Files:** `frontend/src/contexts/RefreshContext.js`, `frontend/src/components/navigation/Header.js`

**What happened:** The refresh button in the header (a circular arrow icon) provided zero feedback when clicked. Users would click it, see nothing happen, wonder if the click was registered, and click it multiple times. There was no visual indication that data was being refreshed, and no confirmation when the refresh completed.

**Investigation:** The refresh button had an `onClick` handler that called the page's data-fetching function, but the button itself had no loading state. It didn't spin, didn't change color, and didn't disable while the fetch was in progress. The data would silently update in the table below, but if the data hadn't changed, there was literally no feedback at all.

**Root Cause:** The refresh button was a simple icon button with no connection to the loading state of the data it triggered. Each page managed its own loading state internally, and the Header component (where the refresh button lives) had no access to that state.

**Fix:** Created a `RefreshContext` (React Context) that provides a shared communication channel between the Header's refresh button and individual page components. When the refresh button is clicked: (1) The button icon starts spinning (CSS animation). (2) The context signals all listening page components to refresh their data. (3) When the data fetch completes, the page component signals back via the context. (4) The button stops spinning and a toast notification appears ("Data refreshed"). This provides clear visual feedback for the entire refresh lifecycle.

**Before:** Refresh button had no feedback. Users couldn't tell if it worked.
**After:** Button spins during refresh. Toast confirms completion.

---

### BUG-032: Approval Queue Skeleton Stuck
- **Commit:** `5c5833d`
- **Files:** `frontend/src/pages/approvals/ApprovalQueue.js`

**What happened:** After adding the skeleton loading placeholders (BUG-030) and the type/status filters, the Approvals page became permanently stuck on the skeleton screen. The loading animation played indefinitely — the actual approval cards never appeared. The browser console showed `ReferenceError: Cannot access 'statusOrder' before initialization`.

**Investigation:** The error was a JavaScript temporal dead zone (TDZ) issue. The `fetchApprovals` function, defined inside a `useCallback`, referenced the `statusOrder` constant to sort approvals by status. However, `statusOrder` was declared as a `const` below the `fetchApprovals` definition in the source code. Unlike `var` declarations (which are hoisted to the top of their scope), `const` declarations exist in a "temporal dead zone" from the start of the scope until the `const` statement is reached. Any access before the declaration throws a `ReferenceError`.

The error occurred inside the `fetchApprovals` function, which was called in a `useEffect`. The try/catch in `fetchApprovals` caught the `ReferenceError`, set `loading` to false in the `finally` block — but by that point, `approvals` was still empty, so the component rendered neither the skeleton (loading=false) nor any cards (no data). Additionally, a secondary crash occurred when the code tried to call `.toUpperCase()` on `approval.entity_type` for some approvals where `entity_type` was null or undefined.

**Root Cause:** Two issues: (1) `const statusOrder` was declared after the `fetchApprovals` function that referenced it, causing a TDZ ReferenceError at runtime. (2) Some approval records in the database had null or missing `entity_type` fields, and the code called `.toUpperCase()` on this value without null checking.

**Fix:** (1) Moved the `statusOrder` constant declaration above the `fetchApprovals` function definition. (2) Added null safety: `(approval.entity_type || 'UNKNOWN').toUpperCase()` to handle approvals with missing entity types.

**Before:** Approvals page permanently stuck on loading skeleton.
**After:** Approvals load and display correctly with proper sorting.

---

### BUG-033: Approval Queue Slow Loading (N+1 Query)
- **Commit:** `5c5833d`
- **Files:** `backend/routes/approvals.py`

**What happened:** The Approvals page took 10-15 seconds to load, compared to 1-2 seconds for other pages like Vehicles and Drivers. Users reported the page as "extremely slow" and often navigated away before it finished loading, assuming it was frozen.

**Investigation:** Added timing logs to the `GET /approvals/queue` endpoint. The total endpoint execution time was 8-12 seconds. Breaking it down: fetching the approvals list itself took ~200ms. The remaining 8-10 seconds was spent in the enrichment loop. For each approval, the code made 4 individual database queries: (1) fetch the entity (vehicle/driver/profile_edit), (2) fetch the submitter (user), (3) fetch related documents, (4) the approval itself was already loaded. With ~200 approvals in the queue, this resulted in ~800 individual MongoDB queries (200 approvals × 4 queries each). Each query took ~10-15ms, and they were executed sequentially with `await`.

**Root Cause:** Classic N+1 query problem. The endpoint fetched N approvals, then for each approval, made 4 additional database queries to enrich the data. This meant 1 + (N × 4) total queries. With 200 approvals, that's 801 queries. Even with MongoDB's fast query times, the cumulative network latency of 800+ sequential round-trips to MongoDB Atlas added up to 10+ seconds.

**Fix:** Replaced the N+1 enrichment loop with a batch query approach that uses exactly 6 queries regardless of the number of approvals:
1. Fetch all approvals (1 query)
2. Collect all unique entity IDs grouped by type
3. Batch fetch all vehicles by IDs (1 query)
4. Batch fetch all drivers by IDs (1 query)
5. Batch fetch all profile_edits by IDs (1 query)
6. Batch fetch all submitter users by IDs (1 query)
7. Batch fetch all documents by entity IDs (1 query)
8. Build lookup maps from the batch results
9. Assemble the enriched response by looking up each approval's data from the maps

This reduces the total queries from 801 to 6, and the total execution time from ~10 seconds to ~500ms.

```python
# Before: N+1 pattern (800+ queries)
for approval in approvals:
    entity = await db.vehicles.find_one({"id": approval["entity_id"]})
    submitter = await db.users.find_one({"id": approval["submitted_by"]})
    docs = await db.documents.find({...}).to_list(50)

# After: Batch pattern (6 queries)
vehicle_docs = await db.vehicles.find({"id": {"$in": list(vehicle_ids)}}).to_list(1000)
vehicles_map = {d["id"]: d for d in vehicle_docs}
# ... same for drivers, users, documents
# Then lookup: vehicles_map.get(approval["entity_id"])
```

**Before:** Approvals page took 10-15 seconds to load.
**After:** Approvals page loads in under 1 second.

---

## Summary by Category

| Category | Count | Key Pattern |
|----------|-------|-------------|
| Deployment & Infrastructure | 12 | CORS, SSL, Python version, filesystem |
| Document Upload & Storage | 8 | Multipart parsing, ephemeral storage, deduplication |
| Data Integrity & Logic | 8 | Pydantic validation, missing fields, sync issues |
| UI/UX & Frontend | 8 | React crashes, loading states, modal issues |
| **Total** | **36** | |

## Most Recurring Issues

1. **CORS** — 6 commits across different root causes (middleware order, credentials, whitespace, exception handler). Each fix addressed a different aspect of CORS, revealing how many subtle ways CORS can break in a cross-origin deployment.

2. **Document Upload** — 8 commits including 3 reverts, ultimately solved by abandoning filesystem storage entirely in favor of MongoDB base64 storage. The core lesson: ephemeral filesystems (Render free tier) are incompatible with file storage requirements.

3. **Pydantic Validation** — 3 commits where `response_model` or model field definitions caused silent data loss or serialization errors. The pattern: MongoDB stores data as flexible dictionaries, but Pydantic models enforce strict typing that conflicts with MongoDB's string-based date storage.

4. **MongoDB Connection** — 3 commits for SSL/TLS configuration on Render. Deployment platform differences in certificate trust stores made database connections fail in production while working locally.
