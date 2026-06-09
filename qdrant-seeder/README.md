# Qdrant Cloud Fruits Seeder

A production-ready Node.js seeding script that reads a dataset of fruits, converts them to text documents, generates vector embeddings using an embedding service endpoint, and batch-upserts them to a Qdrant Cloud database collection.

## Setup Instructions

1. **Install Dependencies**:
   Navigate to this directory and install the required npm packages:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file from the example:
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file and verify or set the variables:
   * `QDRANT_URL`: Your Qdrant Cloud REST API URL (e.g. `https://xxxxxx.sa-east-1-0.aws.cloud.qdrant.io`). Do not include `/dashboard` or trailing slashes.
   * `QDRANT_API_KEY`: Your Qdrant API authorization token.
   * `EMBEDDING_API_URL`: Your Hugging Face Space embedding service endpoint (or local service URL, e.g. `http://localhost:8000/embed`).
   * `COLLECTION_NAME`: (Optional) Change the collection name from the default `fruit_collection` if desired.

3. **Verify Dataset**:
   Ensure `fruits.json` exists in this folder (pre-populated with 25 fruit entries).

## Run Seeder

Execute the seeder script:
```bash
node seed-fruits.js
```

---

## 🏗️ Collection Creation
The script **automatically checks** whether the specified `COLLECTION_NAME` exists in your Qdrant instance. 
1. If the collection is **not found**, it fetches an embedding for the first fruit to dynamically detect the vector dimension size.
2. It then creates the collection with that dimension size using `Cosine` distance, meaning **you do not need to manually create the collection beforehand**.

---

## 🔍 Verifying Inserted Points in Qdrant Cloud

### 1. Using Qdrant Cloud Web Dashboard
1. Log in to your Qdrant Cloud console.
2. Select your cluster and click on **Dashboard** or open the URL in your browser: `https://<your-cluster-id>.aws.cloud.qdrant.io/dashboard`.
3. In the left panel, navigate to **Collections**.
4. Select `fruit_collection` (or your custom name). You will see the total point count, vector dimensions, and status.
5. Go to the **Console** tab inside the dashboard or use the collection inspector to query and view payload details.

### 2. Using `curl` from Terminal
To retrieve information about the collection:
```bash
curl -X GET "https://<your-qdrant-url>/collections/fruit_collection" \
     -H "api-key: <your-api-key>"
```

To retrieve a sample of points:
```bash
curl -X POST "https://<your-qdrant-url>/collections/fruit_collection/points/scroll" \
     -H "api-key: <your-api-key>" \
     -H "Content-Type: application/json" \
     -d '{"limit": 3, "with_payload": true, "with_vector": false}'
```

---

## 🛠️ Troubleshooting Common Errors

### 1. Dimension Mismatch (`400 Bad Request`)
* **Error**: `Response Status: 400`, containing error messages like `Wrong input vector size` or `dimension mismatch`.
* **Cause**: The collection was previously created with a different vector size (e.g. 384 dimensions) than the embedding vector returned by your current model (e.g. 1536 dimensions).
* **Fix**: Delete the old collection to allow the seeder to recreate it with the correct dimensions:
  ```bash
  curl -X DELETE "https://<your-qdrant-url>/collections/fruit_collection" -H "api-key: <your-api-key>"
  ```
  Then re-run `node seed-fruits.js`.

### 2. Invalid API Key / Forbidden (`403 Forbidden` / `401 Unauthorized`)
* **Error**: `Request failed with status code 403` or `Forbidden`.
* **Cause**: The `QDRANT_API_KEY` environment variable is missing, incorrect, or expired.
* **Fix**: Log in to Qdrant Cloud Console, generate a new Read/Write API key, copy it, and paste it exactly inside your `.env` file. Double check that there are no trailing/leading spaces or newline characters.

### 3. Connection Failures (`ENOTFOUND` / `ECONNREFUSED`)
* **Error**: `getaddrinfo ENOTFOUND ...` or `connect ECONNREFUSED`.
* **Cause**: 
  * The `QDRANT_URL` contains a trailing slash (`/`), `/dashboard`, or `/collections/` suffix.
  * You are using the gRPC port `6334` instead of the REST API port `6333` (or the default HTTPS port `443` on Qdrant Cloud).
* **Fix**: Ensure your `QDRANT_URL` matches this pattern: `https://<subdomain>.aws.cloud.qdrant.io` (without any port if using default HTTPS, or port `:6333` if custom. Do not put a trailing slash or path suffix).

### 4. Embedding Service Failure (`405 Method Not Allowed` / Timeout)
* **Error**: `Request failed with status code 405` or connection timeouts on `EMBEDDING_API_URL`.
* **Cause**: The embedding endpoint doesn't support the POST schema or is currently sleeping (Hugging Face Spaces sleep after inactivity).
* **Fix**: Open the Hugging Face Space URL in your browser to wake it up, and check its API schema documentation to ensure it accepts standard inputs.
