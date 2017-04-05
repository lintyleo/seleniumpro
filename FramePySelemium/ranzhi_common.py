from time import sleep

from selenium import webdriver
from selenium.webdriver.support.select import Select


class RanzhiCommon(object):
    """
    然之系统的公共模块: 只关注功能点，不允许带数据
    1. 登录功能
    2. 退出功能
    ...
    """
    base_driver = None
    base_url = None

    APP_ADMIN_SELECTOR = "#s-menu-superadmin > button > i"
    ADMIN_ADD_MEMBER_BUTTON_SELECTOR = "#shortcutBox > div > div:nth-child(1) > div > a > h3"
    ADMIN_FRAME_SELECTOR = "#iframe-superadmin"
    ADMIN_ADD_MEMBER_EDIT_ACCOUNT = "#account"
    ADMIN_ADD_MEMBER_EDIT_REALNAME = "#realname"
    ADMIN_ADD_MEMBER_EDIT_GENDER_FEMALE = "#genderf"
    ADMIN_ADD_MEMBER_EDIT_GENDER_MALE = "#genderm"
    ADMIN_ADD_MEMBER_EDIT_DEPARTMENT = "#dept"
    ADMIN_ADD_MEMBER_EDIT_ROLE = "#role"
    ADMIN_ADD_MEMBER_EDIT_PASSWORD = "#password1"
    ADMIN_ADD_MEMBER_EDIT_PASSWORD_REPEAT = "#password2"
    ADMIN_ADD_MEMBER_EDIT_EMAIL = "#email"
    ADMIN_ADD_MEMBER_SUBMIT_SELETOR = "#submit"

    def __init__(self, driver: webdriver.Firefox, base_url

    ):
    """
    构造方法
    driver: webdriver.Firefox 指的是：
    driver这个参数的类型是 webdriver.Firefox类
    driver必须是webdriver.Firefox类实例化对象
    :param driver:
    :param base_url:
    """
    self.base_driver = driver
    self.base_url = base_url


def open_page(self, url):
    driver = self.base_driver
    driver.get(self.base_url + url)
    sleep(3)


def log_in(self, account, password):
    """
    登录 log in system with account and password
    :param account:
    :param password:
    :return:
    """
    driver = self.base_driver

    # 用户账户
    element_account = driver.find_element_by_css_selector('#account')
    element_account.clear()
    element_account.send_keys(account)

    # 用户密码
    element_password = driver.find_element_by_css_selector('#password')
    element_password.clear()
    element_password.send_keys(password)

    driver.find_element_by_css_selector('#submit').click()

    sleep(3)


def change_language(self, lang):
    """
    lang = en, 英语
    lang = zh_cn，简体
    lang = zh_tw, 繁体
    :param lang:
    :return:
    """
    driver = self.base_driver
    driver.find_element_by_css_selector("#langs > button").click()
    sleep(1)
    if lang == "en":
        lang_number = 3
    elif lang == "zh_CN":
        lang_number = 1
    elif lang == "zh_TW":
        lang_number = 2
    else:
        return "Error lang_number"

    # 拼接一个 CSS 选择器的字符串
    # 用 lang_number 拼接，选择ul的li
    selector = "#langs > ul > li:nth-child(%d) > a" % lang_number
    driver.find_element_by_css_selector(selector).click()
    sleep(3)

    element_language_button = driver.find_element_by_css_selector(
        "#langs > button")
    return element_language_button.text


def log_out(self, lang):
    """
    退出然之系统
    :return:
    """
    driver = self.base_driver

    if lang == "en":
        exit_text = "Logout"
    elif lang == "zh_CN":
        exit_text = "退出"
    elif lang == "zh_TW":
        exit_text = "退出"
    else:
        return "Error lang_number"
    # 退出系统
    driver.find_element_by_css_selector('#start').click()
    sleep(1)

    driver.find_element_by_link_text(exit_text).click()
    sleep(2)


def select_admin_app(self):
    self.base_driver.find_element_by_css_selector(self.APP_ADMIN_SELECTOR).click()
    sleep(1)


def click_add_member_button(self):
    driver = self.base_driver
    frame_admin = driver.find_element_by_css_selector(self.ADMIN_FRAME_SELECTOR)
    driver.switch_to.frame(frame_admin)

    driver.find_element_by_css_selector(self.ADMIN_ADD_MEMBER_BUTTON_SELECTOR).click()
    sleep(1)

    driver.switch_to.default_content()


def add_member_data(self, member_data):
    driver = self.base_driver

    frame_admin = driver.find_element_by_css_selector(self.ADMIN_FRAME_SELECTOR)
    driver.switch_to.frame(frame_admin)

    # 开始填写表单
    # 1. 用户名
    element_account = driver.find_element_by_css_selector(self.ADMIN_ADD_MEMBER_EDIT_ACCOUNT)
    element_account.clear()
    element_account.send_keys(member_data["account"])

    # 2. 真实姓名
    element_real_name = driver.find_element_by_css_selector(self.ADMIN_ADD_MEMBER_EDIT_REALNAME)
    element_real_name.clear()
    element_real_name.send_keys(member_data["real_name"])

    # 3. 性别
    if member_data["gender"] == 'm':
        driver.find_element_by_css_selector(self.ADMIN_ADD_MEMBER_EDIT_GENDER_MALE).click()
    elif member_data["gender"] == 'f':
        driver.find_element_by_css_selector(self.ADMIN_ADD_MEMBER_EDIT_GENDER_MALE).click()

    # 4. 部门
    # 遇到了 <select>
    # 步骤
    # 1) 找到 select 元素
    # 2) 把该元素构造成一个 Select 类的对象
    # 3) 调用对象的方法：select_by_index(): 按照下标进行选择
    element_select_dept = driver.find_element_by_css_selector(self.ADMIN_ADD_MEMBER_EDIT_DEPARTMENT)
    object_select_dept = Select(element_select_dept)
    object_select_dept.select_by_index(member_data["dept"])

    # 5 角色
    # 步骤
    # 1) 找到 select 元素
    # 2) 把该元素构造成一个 Select 类的对象
    # 3) 调用对象的方法：select_by_visible_text()： 按照显示的字符进行选择
    element_select_role = driver.find_element_by_css_selector(self.ADMIN_ADD_MEMBER_EDIT_ROLE)
    object_select_role = Select(element_select_role)
    object_select_role.select_by_index(member_data["role"])

    # 6 密码
    element_real_password = driver.find_element_by_css_selector(self.ADMIN_ADD_MEMBER_EDIT_PASSWORD)
    element_real_password.clear()
    element_real_password.send_keys(member_data["password"])

    #  7 确认密码
    element_real_password2 = driver.find_element_by_css_selector(self.ADMIN_ADD_MEMBER_EDIT_PASSWORD_REPEAT)
    element_real_password2.clear()
    element_real_password2.send_keys(member_data["password"])

    # 8 邮件
    element_real_email = driver.find_element_by_css_selector(self.ADMIN_ADD_MEMBER_EDIT_EMAIL)
    element_real_email.clear()
    element_real_email.send_keys(member_data["email"])

    sleep(1)
    # 点击 保存
    driver.find_element_by_css_selector(self.ADMIN_ADD_MEMBER_SUBMIT_SELETOR).click()

    driver.switch_to.default_content()
    sleep(5)
