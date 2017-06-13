import json

import requests
import xmltodict as xmltodict
from requests.auth import HTTPBasicAuth

params = {"key": "MJX11XSAPG", "location": "shenzhen"}
r = requests.get("http://api.seniverse.com/v3/weather/now.json", params)
print(r.json())
rj = r.json()

print(rj["results"][0]["now"]["text"])

params2 = {"city": "深圳"}
r = requests.get("http://wthrcdn.etouch.cn/WeatherApi", params2)
rx = json.dumps(xmltodict.parse(r.content))
rxx = json.loads(rx)
print(rxx["resp"]["city"])
print(r.status_code)

params3 = {
    "order_no": "88888888666666664444444422222222",
    "app[id]": "app_rfv1SGmPKijLnPef",
    "channel": "wx",
    "amount": 10000000,
    "client_ip": "192.168.1.202",
    "currency": "cny",
    "subject": "iphone 8 正品行货",
    "body": "正规的水货 iphone 8 1000台",
    "description": "iphone 8   一打。。。。订单附加说明，最多 255 个 Unicode 字符。",
}
headers = {"Authorization":"Basic c2tfdGVzdF80bXpqelRpenpQQ0NqVEt5VEN5VGVqYlA6"}
r = requests.post("https://api.pingxx.com/v1/charges", data=params3, headers=headers)
print(r.json()["object"])