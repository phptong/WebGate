from pathlib import Path

from flask import Flask, request, jsonify, send_from_directory
import ollama

PROJECT_ROOT = Path(__file__).resolve().parents[1]
WEB_DIR = PROJECT_ROOT / "apps" / "web"
PACKAGES_DIR = PROJECT_ROOT / "packages"
VENDOR_DIR = PROJECT_ROOT / "vendor"

app = Flask(__name__)


@app.after_request
def add_cors_headers(response):
    # Keep local development flexible. When you open the Web UI from this same
    # Flask server, these headers are not strictly needed, but they help when
    # the UI is served from another localhost port.
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Private-Network"] = "true"
    return response


@app.route("/", methods=["GET"])
def web_root():
    return send_from_directory(WEB_DIR, "index.html")


@app.route("/apps/web", methods=["GET"])
@app.route("/apps/web/", methods=["GET"])
def web_index():
    return send_from_directory(WEB_DIR, "index.html")


@app.route("/apps/web/<path:filename>", methods=["GET"])
def web_assets(filename):
    return send_from_directory(WEB_DIR, filename)


@app.route("/packages/<path:filename>", methods=["GET"])
def package_assets(filename):
    return send_from_directory(PACKAGES_DIR, filename)


@app.route("/vendor/<path:filename>", methods=["GET"])
def vendor_assets(filename):
    return send_from_directory(VENDOR_DIR, filename)


@app.route("/health", methods=["GET", "OPTIONS"])
def health():
    if request.method == "OPTIONS":
        return ("", 204)

    return jsonify({
        "status": "ok",
        "name": "WebGate server",
        "routes": ["/", "/apps/web/index.html", "/health", "/prompt"]
    })


@app.route("/prompt", methods=["POST", "OPTIONS"])
def prompt_model():
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(silent=True) or {}

    if "prompt" not in data:
        return jsonify({"status": "error", "error": "Missing 'prompt' in request body"}), 400

    user_prompt = data.get("prompt")
    model_name = data.get("model", "phi3:mini-4k")

    try:
        response = ollama.generate(model=model_name, prompt=user_prompt)

        return jsonify({
            "status": "success",
            "model": model_name,
            "response": response.get("response", "")
        })

    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


if __name__ == "__main__":
    print("WebGate server starting...")
    print("Open: http://127.0.0.1:5000/apps/web/index.html")
    app.run(host="127.0.0.1", port=5000, debug=True)
