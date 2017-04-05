import unittest
from time import sleep

from selenium import webdriver


class RanzhiMainTest(unittest.TestCase):
    """
    第一步：import unittest
    第二步：继承 unittest.TestCase 类
    第三步：测试的方法，以test_ 开头
    第四步：重写 setUp() 作为 测试前置条件，注意setUp的大小写，必须一致
    第五步：重写 tearDown() 作为 测试清理操作，注意 tearDown的大小写，必须一致
    """

    # 全局变量
    base_driver = None
    base_url = None

    def setUp(self):
        self.base_driver = webdriver.Firefox()
        self.base_url = "http://localhost/ranzhi/www/"

    def tearDown(self):
        self.base_driver.quit()

    def test_01_change_language(self):
        driver = self.base_driver
        driver.get(self.base_url)
        sleep(2)

        driver.find_element_by_css_selector("#langs > button").click()
        sleep(1)

        driver.find_element_by_css_selector("#langs > ul > li:nth-child(3) > a").click()
        sleep(2)

        # 页面应该换成英语了
        actual_lang = driver.find_element_by_css_selector("#langs > button").text
        expected_lang = "English"
        # 与Java的TestNG 相反，先写期待值，再写实际值
        self.assertEqual(expected_lang, actual_lang)

    def test_02_log_in(self):
        driver = self.base_driver
        driver.get(self.base_url)
        sleep(2)

        driver.find_element_by_id("account").send_keys("admin")
        driver.find_element_by_id("password").send_keys("123456")
        driver.find_element_by_id("submit").click()

        sleep(3)
        actual_url = driver.current_url
        expected_url = self.base_url + "sys/index.html"
        self.assertEqual(expected_url, actual_url)
