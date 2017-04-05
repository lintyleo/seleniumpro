from time import sleep

from box_driver import BoxDriver


class RanzhiCommon(object):
    """
    然之系统的公共模块: 只关注功能点，不允许带数据
    1. 登录功能
    2. 退出功能
    ...
    """
    base_driver = None
    base_url = None

    APP_ADMIN_SELECTOR = "s,#s-menu-superadmin > button > i"
    ADMIN_ADD_MEMBER_BUTTON_SELECTOR = "s,#shortcutBox > div > div:nth-child(1) > div > a > h3"
    ADMIN_FRAME_SELECTOR = "s,#iframe-superadmin"
    ADMIN_ADD_MEMBER_EDIT_ACCOUNT = "s,#account"
    ADMIN_ADD_MEMBER_EDIT_REALNAME = "s,#realname"
    ADMIN_ADD_MEMBER_EDIT_GENDER_FEMALE = "s,#genderf"
    ADMIN_ADD_MEMBER_EDIT_GENDER_MALE = "s,#genderm"
    ADMIN_ADD_MEMBER_EDIT_DEPARTMENT = "s,#dept"
    ADMIN_ADD_MEMBER_EDIT_ROLE = "s,#role"
    ADMIN_ADD_MEMBER_EDIT_PASSWORD = "s,#password1"
    ADMIN_ADD_MEMBER_EDIT_PASSWORD_REPEAT = "s,#password2"
    ADMIN_ADD_MEMBER_EDIT_EMAIL = "s,#email"
    ADMIN_ADD_MEMBER_SUBMIT_SELETOR = "s,#submit"

    def __init__(self, driver: BoxDriver, base_url

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
    driver.navigate(self.base_url + url)
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
    driver.type('s,#account', account)

    # 用户密码
    driver.type('s,#password', password)

    driver.click('s,#submit')

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
    driver.click("s,#langs > button")
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
    selector = "s,#langs > ul > li:nth-child(%d) > a" % lang_number
    driver.click(selector)
    sleep(3)

    return driver.get_text("s,#langs > button")


def log_out(self, lang):
    """
    退出然之系统
    :return:
    """
    driver = self.base_driver

    if lang == "en":
        exit_text = "l,Logout"
    elif lang == "zh_CN":
        exit_text = "l,退出"
    elif lang == "zh_TW":
        exit_text = "l,退出"
    else:
        return "Error lang_number"
    # 退出系统
    driver.click('s,#start')
    sleep(1)

    driver.click(exit_text)
    sleep(2)


def select_admin_app(self):
    self.base_driver.click(self.APP_ADMIN_SELECTOR)
    sleep(1)


def click_add_member_button(self):
    driver = self.base_driver

    driver.switch_to_frame(self.ADMIN_FRAME_SELECTOR)
    sleep(1)

    driver.click(self.ADMIN_ADD_MEMBER_BUTTON_SELECTOR)
    sleep(1)

    driver.switch_to_default()


def add_member_data(self, member_data):
    driver = self.base_driver

    driver.switch_to_frame(self.ADMIN_FRAME_SELECTOR)

    # 开始填写表单

    # 1. 用户名
    driver.type(self.ADMIN_ADD_MEMBER_EDIT_ACCOUNT, member_data["account"])

    # 2. 真实姓名
    driver.type(self.ADMIN_ADD_MEMBER_EDIT_REALNAME, member_data["real_name"])

    # 3. 性别
    if member_data["gender"] == 'm':
        driver.click(self.ADMIN_ADD_MEMBER_EDIT_GENDER_MALE)
    elif member_data["gender"] == 'f':
        driver.click(self.ADMIN_ADD_MEMBER_EDIT_GENDER_MALE)

    # 4. 部门
    # 遇到了 <select>
    # 步骤
    # 1) 找到 select 元素
    # 2) 把该元素构造成一个 Select 类的对象
    # 3) 调用对象的方法：select_by_index(): 按照下标进行选择
    driver.select_by_index(self.ADMIN_ADD_MEMBER_EDIT_DEPARTMENT, member_data["dept"])

    # 5 角色
    # 步骤
    # 1) 找到 select 元素
    # 2) 把该元素构造成一个 Select 类的对象
    # 3) 调用对象的方法：select_by_visible_text()： 按照显示的字符进行选择
    driver.select_by_index(self.ADMIN_ADD_MEMBER_EDIT_ROLE, member_data["role"])

    # 6 密码
    driver.type(self.ADMIN_ADD_MEMBER_EDIT_PASSWORD, member_data["password"])

    #  7 确认密码
    driver.type(self.ADMIN_ADD_MEMBER_EDIT_PASSWORD_REPEAT, member_data["password"])

    # 8 邮件
    driver.type(self.ADMIN_ADD_MEMBER_EDIT_EMAIL, member_data["email"])

    sleep(1)
    # 点击 保存
    driver.click(self.ADMIN_ADD_MEMBER_SUBMIT_SELETOR)

    driver.switch_to_default()
    sleep(5)
