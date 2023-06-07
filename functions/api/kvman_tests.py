import unittest
import requests
import base64

# Setup local runtime
#   1. echo "KVMAN_AUTH_TOKEN=123456789" > .dev.vars
#   2. wrangler pages dev local --kv=NETWORK_RULES

class TestKVManagementAPI(unittest.TestCase):
    BASE_URL = "http://127.0.0.1:8788/api/kvman"
    AUTH_TOKEN = "123456789"
    AUTH_TOKEN = base64.b64encode(AUTH_TOKEN.encode('utf-8')).decode('utf-8')

    def test_0000_auth_fail(self):
        data = {"key": "key1"}
        invalid_auth = base64.b64encode('invalid auth code'.encode('utf-8')).decode('utf-8')
        response = requests.post(f"{self.BASE_URL}?action=list", json=data, headers={"Authorization": f"Bearer {invalid_auth}"})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["success"])
        self.assertEqual(response.json()["message"], f"Unauthorized")

    def test_0001_prepare(self):
        data = {"key": "key1"}
        response = requests.post(f"{self.BASE_URL}?action=del", json=data, headers={"Authorization": f"Bearer {self.AUTH_TOKEN}"})

    def test_00_add_success(self):
        data = {"key": "key1", "value": "val1234"}
        response = requests.post(f"{self.BASE_URL}?action=add", json=data, headers={"Authorization": f"Bearer {self.AUTH_TOKEN}"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["message"], f"Key {data['key']} added")

    def test_01_add_existing_key(self):
        data = {"key": "key1", "value": "val1234"}
        response = requests.post(f"{self.BASE_URL}?action=add", json=data, headers={"Authorization": f"Bearer {self.AUTH_TOKEN}"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["message"], f"Value updated for key {data['key']}")

    def test_02_get_success(self):
        data = {"key": "key1"}
        response = requests.post(f"{self.BASE_URL}?action=get", json=data, headers={"Authorization": f"Bearer {self.AUTH_TOKEN}"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["message"], "OK")
        self.assertIsInstance(response.json()["payload"], dict)
        self.assertEqual(response.json()["payload"]["key"], data["key"])

    def test_03_get_non_existing_key(self):
        data = {"key": "non-existent-key"}
        response = requests.post(f"{self.BASE_URL}?action=get", json=data, headers={"Authorization": f"Bearer {self.AUTH_TOKEN}"})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["success"])
        self.assertEqual(response.json()["message"], f"Key {data['key']} does not exist")

    def test_04_list_success(self):
        response = requests.post(f"{self.BASE_URL}?action=list", headers={"Authorization": f"Bearer {self.AUTH_TOKEN}"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["message"], "OK")
        self.assertIsInstance(response.json()["payload"], list)

    def test_05_export_success(self):
        response = requests.post(f"{self.BASE_URL}?action=export", headers={"Authorization": f"Bearer {self.AUTH_TOKEN}"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["message"], "OK")
        self.assertIsInstance(response.json()["payload"], list)

    def test_06_import_success(self):
        data = [{"name": "key1", "value": "value1"}, {"name": "key2", "value": "value2"}]
        response = requests.post(f"{self.BASE_URL}?action=import", json=data, headers={"Authorization": f"Bearer {self.AUTH_TOKEN}"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["message"], "OK")
        self.assertIsInstance(response.json()["payload"], dict)
        self.assertIsInstance(response.json()["payload"]["added"], list)
        self.assertIsInstance(response.json()["payload"]["skipped"], list)

    def test_07_del_success(self):
        data = {"key": "key1"}
        response = requests.post(f"{self.BASE_URL}?action=del", json=data, headers={"Authorization": f"Bearer {self.AUTH_TOKEN}"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["message"], f"Key {data['key']} deleted")

    def test_08_del_non_existing_key(self):
        data = {"key": "non-existent-key"}
        response = requests.post(f"{self.BASE_URL}?action=del", json=data, headers={"Authorization": f"Bearer {self.AUTH_TOKEN}"})
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])
        self.assertEqual(response.json()["message"], f"Key {data['key']} does not exist")

if __name__ == '__main__':
    unittest.main()
