# coding=utf-8
import time
from selenium import webdriver
from selenium.webdriver import ActionChains
from selenium.webdriver import FirefoxProfile
from selenium.webdriver.support.select import Select


class BoxDriver(object):
    """
    a simple demo of selenium framework tool
    """

    base_driver = None
    by_char = None

    def __init__(self, by_char=",", profile=None, browser="chrome"):
        """
        构造方法：实例化 BoxDriver 时候使用
        :param by_char: 分隔符
        :param firefox_profile:
        可选择的参数，如果不传递，就是None
        如果传递一个 profile，就会按照预先的设定启动火狐
        去掉遮挡元素的提示框等
        """
        driver = None
        if browser == "chrome":
            driver = webdriver.Chrome(executable_path=profile)
        elif browser == "firefox":

            if profile is not None:
                profile = FirefoxProfile(profile)

            driver = webdriver.Firefox(firefox_profile=profile)
        try:
            self.base_driver = driver
            self.by_char = by_char
        except Exception:
            raise NameError("Firefox Not Found!")

    def clear_cookies(self):
        """
        clear all cookies after driver init
        """
        self.base_driver.delete_all_cookies()

    def refresh_browser(self):
        self.base_driver.refresh()

    def maximize_window(self):
        self.base_driver.maximize_window()

    def navigate(self, url):
        """
        打开 URL
        :param url:
        :return:
        """
        self.base_driver.get(url)

    def quit(self):
        self.base_driver.quit()

    def close_browser(self):
        self.base_driver.close()

    def locate_element(self, selector):
        """
        to locate element by selector
        :arg
        selector should be passed by an example with "i,xxx"
        "x,//*[@id='langs']/button"
        :returns
        DOM element
        """
        if self.by_char not in selector:
            return self.base_driver.find_element_by_id(selector)

        selector_by = selector.split(self.by_char)[0]
        selector_value = selector.split(self.by_char)[1]

        if selector_by == "i" or selector_by == 'id':
            element = self.base_driver.find_element_by_id(selector_value)
        elif selector_by == "n" or selector_by == 'name':
            element = self.base_driver.find_element_by_name(selector_value)
        elif selector_by == "c" or selector_by == 'class_name':
            element = self.base_driver.find_element_by_class_name(selector_value)
        elif selector_by == "l" or selector_by == 'link_text':
            element = self.base_driver.find_element_by_link_text(selector_value)
        elif selector_by == "p" or selector_by == 'partial_link_text':
            element = self.base_driver.find_element_by_partial_link_text(selector_value)
        elif selector_by == "t" or selector_by == 'tag_name':
            element = self.base_driver.find_element_by_tag_name(selector_value)
        elif selector_by == "x" or selector_by == 'xpath':
            element = self.base_driver.find_element_by_xpath(selector_value)
        elif selector_by == "s" or selector_by == 'css_selector':
            element = self.base_driver.find_element_by_css_selector(selector_value)
        else:
            raise NameError("Please enter a valid type of targeting elements.")

        return element

    def type(self, selector, text):
        """
        Operation input box.

        Usage:
        driver.type("i,el","selenium")
        """
        el = self.locate_element(selector)
        el.clear()
        el.send_keys(text)

    def click(self, selector):
        """
        It can click any text / image can be clicked
        Connection, check box, radio buttons, and even drop-down box etc..

        Usage:
        driver.click("i,el")
        """
        el = self.locate_element(selector)
        el.click()

    def select_by_index(self, selector, index):
        """
        It can click any text / image can be clicked
        Connection, check box, radio buttons, and even drop-down box etc..

        Usage:
        driver.select_by_index("i,el")
        """
        el = self.locate_element(selector)
        Select(el).select_by_index(index)

    def select_by_visible_text(self, selector, text):
        """
        It can click any text / image can be clicked
        Connection, check box, radio buttons, and even drop-down box etc..

        Usage:
        driver.select_by_index("i,el")
        """
        el = self.locate_element(selector)
        Select(el).select_by_visible_text(text)

    def select_by_value(self, selector, value):
        """
        It can click any text / image can be clicked
        Connection, check box, radio buttons, and even drop-down box etc..

        Usage:
        driver.select_by_index("i,el")
        """
        el = self.locate_element(selector)
        Select(el).select_by_value(value)

    def click_by_text(self, text):
        """
        Click the element by the link text

        Usage:
        driver.click_text("新闻")
        """
        self.locate_element('p,' + text).click()

    def submit(self, selector):
        """
        Submit the specified form.

        Usage:
        driver.submit("i,el")
        """
        el = self.locate_element(selector)
        el.submit()

    def execute_js(self, script):
        """
        Execute JavaScript scripts.

        Usage:
        driver.js("window.scrollTo(200,1000);")
        """
        self.base_driver.execute_script(script)

    def get_attribute(self, selector, attribute):
        """
        Gets the value of an element attribute.

        Usage:
        driver.get_attribute("i,el","type")
        """
        el = self.locate_element(selector)
        return el.getAttribute(attribute)

    def get_text(self, selector):
        """
        Get element text information.

        Usage:
        driver.get_text("i,el")
        """
        el = self.locate_element(selector)
        return el.text

    def get_display(self, selector):
        """
        Gets the element to display,The return result is true or false.

        Usage:
        driver.get_display("i,el")
        """
        el = self.locate_element(selector)
        return el.is_displayed()

    def get_title(self):
        '''
        Get window title.

        Usage:
        driver.get_title()
        '''
        return self.base_driver.title

    def get_url(self):
        """
        Get the URL address of the current page.

        Usage:
        driver.get_url()
        """
        return self.base_driver.current_url

    def accept_alert(self):
        '''
            Accept warning box.

            Usage:
            driver.accept_alert()
            '''
        self.base_driver.switch_to.alert.accept()

    def dismiss_alert(self):
        '''
        Dismisses the alert available.

        Usage:
        driver.dismissAlert()
        '''
        self.base_driver.switch_to.alert.dismiss()

    def implicitly_wait(self, secs):
        """
        Implicitly wait. All elements on the page.

        Usage:
        driver.implicitly_wait(10)
        """
        self.base_driver.implicitly_wait(secs)

    def switch_to_frame(self, selector):
        """
        Switch to the specified frame.

        Usage:
        driver.switch_to_frame("i,el")
        """
        el = self.locate_element(selector)
        self.base_driver.switch_to.frame(el)

    def switch_to_default(self):
        """
        Returns the current form machine form at the next higher level.
        Corresponding relationship with switch_to_frame () method.

        Usage:
        driver.switch_to_frame_out()
        """
        self.base_driver.switch_to.default_content()

    def open_new_window(self, selector):
        '''
        Open the new window and switch the handle to the newly opened window.

        Usage:
        driver.open_new_window()
        '''
        original_windows = self.base_driver.current_window_handle
        el = self.locate_element(selector)
        el.click()
        all_handles = self.base_driver.window_handles
        for handle in all_handles:
            if handle != original_windows:
                self.base_driver._switch_to.window(handle)

    def wait(self, seconds):
        time.sleep(seconds)

    def move_to(self, selector):
        """
        to move mouse pointer to selector
        :param selector:
        :return:
        """
        el = self.locate_element(selector)
        ActionChains(self.base_driver).move_to_element(el).perform()

    def right_click(self, selector):
        """
        to click the selector by the right button of mouse
        :param selector:
        :return:
        """
        el = self.locate_element(selector)
        ActionChains(self.base_driver).context_click(el).perform()
