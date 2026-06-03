from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
import requests
import time
import os
import secrets
import base64
import hashlib
import hmac
import json
import uuid

app = Flask(__name__)
CORS(app)

BASE_URL = "https://api.wepro.synet-app.com/api/v1"

REGISTER_URL = BASE_URL + "/register"
LOGIN_URL = BASE_URL + "/auth"
PAYMENT_URL = BASE_URL + "/payment/bill/immediate"

PLATFORM = "DemoClock"
DEFAULT_CURRENCY = "TWD"

FRONTEND_BASE_URL = "https://sabrinacfei.github.io/xinqinji-demo"

BACKEND_BASE_URL = os.getenv(
    "BACKEND_BASE_URL",
    'https://xinqinji-payment.onrender.com'
)

PAYMENT_LINKS = {}

LINE_PAY_API_BASE_URL = os.getenv(
    "LINE_PAY_API_BASE_URL",
    "https://sandbox-api-pay.line.me"
)
LINE_PAY_CHANNEL_ID = os.getenv("LINE_PAY_CHANNEL_ID", "")
LINE_PAY_CHANNEL_SECRET = os.getenv("LINE_PAY_CHANNEL_SECRET", "")
LINE_PAY_DEVICE_PROFILE_ID = os.getenv("LINE_PAY_DEVICE_PROFILE_ID", "")


def make_id():
    return int(time.time())


def make_payment_token():
    return secrets.token_urlsafe(8)


def compact_json(data):
    return json.dumps(data, ensure_ascii=False, separators=(",", ":"))


def line_pay_signature(uri, body, nonce):
    message = LINE_PAY_CHANNEL_SECRET + uri + body + nonce
    digest = hmac.new(
        LINE_PAY_CHANNEL_SECRET.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256
    ).digest()
    return base64.b64encode(digest).decode("utf-8")


def line_pay_headers(uri, body):
    nonce = str(uuid.uuid4())
    headers = {
        "Content-Type": "application/json",
        "X-LINE-ChannelId": LINE_PAY_CHANNEL_ID,
        "X-LINE-Authorization-Nonce": nonce,
        "X-LINE-Authorization": line_pay_signature(uri, body, nonce)
    }

    if LINE_PAY_DEVICE_PROFILE_ID:
        headers["X-LINE-MerchantDeviceProfileId"] = LINE_PAY_DEVICE_PROFILE_ID

    return headers


def validate_payment_request(data):
    order_no = data.get("orderNo")
    phone = data.get("phone")
    amount = data.get("amount")

    if not order_no or not phone or not amount:
        return None, jsonify({
            "success": False,
            "message": "缺少 orderNo、phone 或 amount"
        }), 400

    return (order_no, phone, int(amount), data.get("items") or []), None, None


@app.route("/api/create-payment-link", methods=["POST"])
@app.route("/api/create-card-payment-link", methods=["POST"])
def create_card_payment_link():
    data = request.get_json() or {}

    parsed, error_body, status = validate_payment_request(data)
    if error_body:
        return error_body, status

    order_no, phone, amount, _items = parsed

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

    token_id = make_payment_token()
    PAYMENT_LINKS[token_id] = {
        "paymentUrl": payment_url,
        "orderNo": order_no,
        "createdAt": int(time.time())
    }

    return jsonify({
        "success": True,
        "provider": "newebpay",
        "orderNo": order_no,
        "uid": uid,
        "paymentUrl": payment_url,
        "qrUrl": f"{BACKEND_BASE_URL}/pay/{token_id}",
        "raw": payment_json
    })


@app.route("/api/create-line-pay-link", methods=["POST"])
def create_line_pay_link():
    data = request.get_json() or {}

    parsed, error_body, status = validate_payment_request(data)
    if error_body:
        return error_body, status

    if not LINE_PAY_CHANNEL_ID or not LINE_PAY_CHANNEL_SECRET:
        return jsonify({
            "success": False,
            "message": "LINE Pay 尚未設定 LINE_PAY_CHANNEL_ID / LINE_PAY_CHANNEL_SECRET"
        }), 500

    order_no, phone, amount, items = parsed
    line_order_id = f"{order_no}-{int(time.time())}"
    products = []

    for item in items:
        qty = int(item.get("qty") or 0)
        price = int(item.get("price") or 0)
        if qty <= 0 or price < 0:
            continue

        products.append({
            "id": str(item.get("id") or item.get("name") or "item"),
            "name": str(item.get("name") or "餐點"),
            "quantity": qty,
            "price": price
        })

    if not products:
        products = [{
            "id": "takeaway",
            "name": f"外帶訂單 {order_no}",
            "quantity": 1,
            "price": amount
        }]

    uri = "/v3/payments/request"
    payload = {
        "amount": amount,
        "currency": DEFAULT_CURRENCY,
        "orderId": line_order_id,
        "packages": [{
            "id": order_no,
            "amount": amount,
            "name": f"外帶訂單 {order_no}",
            "products": products
        }],
        "redirectUrls": {
            "confirmUrl": f"{BACKEND_BASE_URL}/line-pay/confirm?pickupNo={order_no}&amount={amount}",
            "cancelUrl": f"{FRONTEND_BASE_URL}/takeaway.html?payment=cancel&pickupNo={order_no}"
        }
    }
    body = compact_json(payload)

    line_res = requests.post(
        LINE_PAY_API_BASE_URL + uri,
        data=body.encode("utf-8"),
        headers=line_pay_headers(uri, body),
        timeout=20
    )

    try:
        line_json = line_res.json()
    except ValueError:
        return jsonify({
            "success": False,
            "message": "LINE Pay 回傳格式錯誤",
            "detail": line_res.text
        }), 500

    if not line_res.ok or str(line_json.get("returnCode")) != "0000":
        return jsonify({
            "success": False,
            "message": "LINE Pay 建立付款失敗",
            "detail": line_json
        }), 500

    info = line_json.get("info") or {}
    payment_url = (
        (info.get("paymentUrl") or {}).get("web")
        or (info.get("paymentUrl") or {}).get("app")
    )

    if not payment_url:
        return jsonify({
            "success": False,
            "message": "LINE Pay 有回傳，但找不到付款 URL",
            "detail": line_json
        }), 500

    return jsonify({
        "success": True,
        "provider": "linepay",
        "orderNo": order_no,
        "lineOrderId": line_order_id,
        "transactionId": str(info.get("transactionId") or ""),
        "paymentUrl": payment_url,
        "qrUrl": payment_url,
        "raw": line_json
    })


@app.route("/pay/<token_id>", methods=["GET"])
def pay_from_qr(token_id):
    item = PAYMENT_LINKS.get(token_id)

    if not item:
        return "付款連結已失效，請回機台重新產生 QR code。", 404

    return redirect(item["paymentUrl"])


@app.route("/line-pay/confirm", methods=["GET"])
def line_pay_confirm():
    transaction_id = request.args.get("transactionId")
    pickup_no = request.args.get("pickupNo", "P000")
    amount = request.args.get("amount")

    if not transaction_id or not amount:
        return redirect(
            f"{FRONTEND_BASE_URL}/takeaway.html?payment=fail&pickupNo={pickup_no}"
        )

    uri = f"/v3/payments/{transaction_id}/confirm"
    payload = {
        "amount": int(amount),
        "currency": DEFAULT_CURRENCY
    }
    body = compact_json(payload)

    line_res = requests.post(
        LINE_PAY_API_BASE_URL + uri,
        data=body.encode("utf-8"),
        headers=line_pay_headers(uri, body),
        timeout=20
    )

    try:
        line_json = line_res.json()
    except ValueError:
        print("LINE PAY CONFIRM invalid response:", line_res.text)
        return redirect(
            f"{FRONTEND_BASE_URL}/takeaway.html?payment=fail&pickupNo={pickup_no}"
        )

    print("LINE PAY CONFIRM status:", line_res.status_code)
    print("LINE PAY CONFIRM json:", line_json)

    if line_res.ok and str(line_json.get("returnCode")) == "0000":
        return redirect(
            f"{FRONTEND_BASE_URL}/takeaway.html?payment=success&pickupNo={pickup_no}"
        )

    return redirect(
        f"{FRONTEND_BASE_URL}/takeaway.html?payment=fail&pickupNo={pickup_no}"
    )


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
