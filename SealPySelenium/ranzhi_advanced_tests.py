import csv
import unittest

from box_driver import BoxDriver
from ranzhi_common import RanzhiCommon


class RanzhiAdvancedTests(unittest.TestCase):
    """
    测试主页
        1. 测试登录
        2. 测试语言
    """

    # 成员变量
    base_driver = None
    base_url = None
    common = None

    def setUp(self):
        """
        前置条件
        :return:
        """
        profile = "C:/python35/chromedriver.exe"

        self.base_driver = BoxDriver(",", profile, "chrome")
        self.base_driver.clear_cookies()
        self.base_url = "http://localhost/"
        self.common = RanzhiCommon(self.base_driver, self.base_url)

    def tearDown(self):
        """
        测试清理
        :return:
        """
        self.base_driver.quit()

    def test_add_member_by_csv(self):
        """
        测试 添加多个用户
        从CSV文件读取数据，并添加到系统各种
        :return:
        """
        common = self.common
        driver = self.base_driver

        csv_file = open("member_list_with_header.csv", "r",
                        encoding="utf8")
        csv_data = csv.reader(csv_file)

        is_header = True
        for row in csv_data:
            if is_header:
                is_header = False
                continue

            lang = "zh_CN"
            common.open_page("")
            common.change_language(lang)
            common.log_in("admin", "123456")
            common.select_admin_app()
            expected_url = self.base_url + "sys/admin/"
            self.assertEqual(expected_url, driver.get_url(),
                             "后台管理按钮点击后页面跳转失败！")

            common.click_add_member_button()

            expected_url = self.base_url + "sys/user-create.html"
            self.assertEqual(expected_url, driver.get_url(),
                             "添加成员按钮点击后页面跳转失败！")

            # dict 类型的数据
            member_data = {
                "account": row[0],
                "real_name": row[1],
                "gender": row[2],
                "dept": row[3],
                "role": row[4],
                "password": row[5],
                "email": row[6]
            }
            common.add_member_data(member_data)
            expected_url = self.base_url + "sys/user-admin.html"
            self.assertEqual(expected_url, driver.get_url(),
                             "添加成员保存失败！")

            common.log_out(lang)
            common.open_page("")
            common.log_in(member_data["account"], member_data["password"])
            expected_url = self.base_url + "sys/index.html"
            self.assertEqual(expected_url, driver.get_url(),
                             "新用户登录失败！")
            common.log_out(lang)
        csv_file.close()
