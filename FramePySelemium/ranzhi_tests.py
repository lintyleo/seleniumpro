import csv
import unittest

from selenium import webdriver

from ranzhi_common import RanzhiCommon


class RanzhiTests(unittest.TestCase):
    """
    测试主页
        1. 测试登录
        2. 测试语言
    """

    # 成员变量
    firefox_driver = None
    base_url = None
    common = None

    def setUp(self):
        """
        前置条件
        :return:
        """
        self.firefox_driver = webdriver.Firefox()
        self.firefox_driver.delete_all_cookies()
        self.base_url = "http://localhost/ranzhi/www/"
        self.common = RanzhiCommon(self.firefox_driver, self.base_url)

    def tearDown(self):
        """
        测试清理
        :return:
        """
        self.firefox_driver.quit()
        self.common = None

    def test_01_log_in_by_admin(self):
        """
        使用 admin登录
        :return:
        """
        common = self.common
        driver = self.firefox_driver
        # 打开主页
        common.open_page("")
        common.log_in("admin", "123456")
        expected_url = self.base_url + "sys/index.html"
        self.assertEqual(expected_url, driver.current_url,
                         "系统使用管理员登录失败！")

    def test_02_change_language_english(self):
        """
        测试 切换语言：英语
        :return:
        """
        common = self.common
        actual_display = common.change_language("en")
        self.assertEqual("English", actual_display,
                         "系统切换英语失败！")

    def test_03_log_in_by_csv(self):
        """
        批量登录
        :return:
        """
        driver = self.firefox_driver
        common = self.common

        # 开始读CSV
        # 步骤：
        # 1. csv_file 打开csv文件，读到一个csv_file变量中
        # 2. csv_data 用csv.reader() 把上一步的变量构建出csv数据
        # 3. 循环 csv_data
        # 4. 关闭 csv_file
        csv_file = open("user_list_with_header.csv", "r",
                        encoding="utf8")
        csv_data = csv.reader(csv_file)

        is_header = True
        for row in csv_data:
            # 第一行是标题，需要跳过（continue）
            if is_header:
                is_header = False
                continue

            # 打开主页
            common.open_page("")
            expected_display = None
            actual_display = common.change_language(row[2])
            if row[2] == 'en':
                expected_display = "English"
            elif row[2] == 'zh_CN':
                expected_display = "简体"
            elif row[2] == 'zh_TW':
                expected_display = "繁体"

            self.assertEqual(expected_display, actual_display,
                             "系统切换语言失败！")

            common.log_in(row[0], row[1])
            expected_url = self.base_url + "sys/index.html"
            self.assertEqual(expected_url, driver.current_url,
                             "登录后跳转失败！")

            common.log_out(row[2])
            expected_url = self.base_url + "sys/user-login.html"
            self.assertEqual(expected_url, driver.current_url,
                             "退出后跳转失败！")

        csv_file.close()
