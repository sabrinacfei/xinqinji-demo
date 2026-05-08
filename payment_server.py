from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
import requests
import time
import os

app = Flask(__name__)
CORS(app)

BASE_URL = "https://api.wepro.synet-app.com/api/v1"

REGISTER_URL = BASE_URL + "/register"
LOGIN_URL = BASE_URL + "/auth"
PAYMENT_URL = BASE_URL + "/payment/bill/immediate"

PLATFORM = "DemoClock"

FRONTEND_BASE_URL = "https://sabrinacfei.github.io/xinqinji-demo"

BACKEND_BASE_URL = os.getenv(
    "BACKEND_BASE_URL",
    'https://xinqinji-payment.onrender.com'
)


def make_id():
    return int(time.time())


@app.route("/api/create-payment-link", methods=["POST"])
def create_payment_link():
    data = request.get_json() or {}

    order_no = data.get("orderNo")
    phone = data.get("phone")
    amount = data.get("amount")

    if not order_no or not phone or not amount:
        return jsonify({
            "success": False,
            "message": "缺少 orderNo、phone 或 amount"
        }), 400

    account = phone
    email = f"{phone}@democlock.local"
    password = phone
    request_id = make_id()

    # 1. 註冊會員
    register_payload = {
        "data": {
            "type": "users",
            "id": request_id,
            "attributes": {
                "account": account,
                "email": email,
                "password": password,
                "platform": PLATFORM
            }
        }
    }

    register_res = requests.post(
        REGISTER_URL,
        json=register_payload,
        timeout=20
    )

    print("REGISTER status:", register_res.status_code)
    print("REGISTER text:", register_res.text)


    # 2. 登入取得 uid
    login_payload = {
        "data": {
            "type": "auth",
            "id": request_id,
            "attributes": {
                "identification": account,
                "password": password,
                "platform": PLATFORM
            }
        }
    }

    login_res = requests.post(
        LOGIN_URL,
        json=login_payload,
        timeout=20
    )

    print("LOGIN status:", login_res.status_code)
    print("LOGIN text:", login_res.text)

    if not login_res.ok:
        return jsonify({
            "success": False,
            "message": "登入失敗",
            "detail": login_res.text
        }), 500

    login_json = login_res.json()

    uid = (
        login_json.get("data", {}).get("attributes", {}).get("uid")
        or login_json.get("data", {}).get("id")
        or login_json.get("uid")
    )

    token = (
        login_json.get("meta", {}).get("token")
        or login_json.get("token")
    )

    if not uid:
        return jsonify({
            "success": False,
            "message": "登入成功，但找不到 uid",
            "detail": login_json
        }), 500

    # 3. 取得付款連結
    payment_payload = {
        "data": {
            "type": "payment",
            "id": request_id,
            "attributes": {
                "uid": str(uid),
                "platform": PLATFORM,
                "price": int(amount),
                "return_url": f"{BACKEND_BASE_URL}/payment-return?pickupNo={order_no}"
            }
        }
    }

    headers = {}

    if token:
        headers["Authorization"] = f"Bearer {token}"

    print("PAYMENT payload:", payment_payload)
    print("PAYMENT headers:", headers)

    payment_res = requests.post(
        PAYMENT_URL,
        json=payment_payload,
        headers=headers,
        timeout=20
    )

    print("PAYMENT status:", payment_res.status_code)
    print("PAYMENT text:", payment_res.text)

    if not payment_res.ok:
        return jsonify({
            "success": False,
            "message": "取得付款連結失敗",
            "detail": payment_res.text
        }), 500

    payment_json = payment_res.json()

    payment_url = (
        payment_json.get("meta", {}).get("redirect_url")
        or payment_json.get("data", {}).get("attributes", {}).get("redirect_url")
        or payment_json.get("redirect_url")
    )

    if not payment_url:
        return jsonify({
            "success": False,
            "message": "API 有回傳，但找不到付款連結 redirect_url",
            "detail": payment_json
        }), 500

    return jsonify({
        "success": True,
        "orderNo": order_no,
        "uid": uid,
        "paymentUrl": payment_url,
        "raw": payment_json
    })


@app.route("/payment-return", methods=["GET", "POST"])
def payment_return():
    pickup_no = request.args.get("pickupNo", "P000")

    print("PAYMENT RETURN method:", request.method)
    print("PAYMENT RETURN args:", dict(request.args))
    print("PAYMENT RETURN form:", dict(request.form))
    print("PAYMENT RETURN json:", request.get_json(silent=True))

    return redirect(
        f"{FRONTEND_BASE_URL}/takeaway.html?payment=success&pickupNo={pickup_no}"
    )

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "ok": True,
        "service": "DemoClock payment server"
    })


if __name__ == "__main__":
    app.run(port=5000, debug=True)