from time import sleep

from selenium import webdriver


class RanzhiTest():
    """
    制作一个类：RanzhiTest
    RanzhiTest类有一个能力，log_in()
    """

    def log_in(self):
        """
        登录然之系统
        :return:
        """

        # 声明一个司机，司机是个Firefox类的对象
        driver = webdriver.Firefox()

        # 让司机加载一个网页
        driver.get("http://localhost/ranzhi/www/")

        # 给司机3秒钟去打开
        sleep(3)

        # 开始登录
        # 1. 让司机找用户名的输入框
        driver.find_element_by_css_selector('#account').send_keys("admin")

        # 2. 让司机找密码的输入框
        driver.find_element_by_css_selector('#password').send_keys("123456")

        # 3. 让司机找 登录按钮 并 单击
        driver.find_element_by_css_selector('#submit').click()
        sleep(10)

        # 4. 让司机找 左下角的头像按钮 并 单击
        driver.find_element_by_css_selector('#start > div').click()
        sleep(1)

        # 5. 让司机找 退出 并点击
        driver.find_element_by_css_selector('#startMenu > li:nth-child(10) > a').click()
        sleep(10)

        # 6. 司机自己退出，关闭了火狐浏览器
        driver.quit()


# 主方法入口
if __name__ == '__main__':
    r_test = RanzhiTest()
    r_test.log_in()
