from time import sleep

from selenium import webdriver


class PyTest2():
    def test(self):
        xx = webdriver.Firefox()
        xx.get("http://172.31.95.220/ranzhi/")
        sleep(3)

        xx.refresh()
        sleep(3)

        xx.find_element_by_css_selector('#account').send_keys("admin")
        xx.find_element_by_css_selector('#password').send_keys("123456")
        xx.find_element_by_css_selector('#submit').click()
        sleep(5)

        xx.quit()


if __name__ == "__main__":
    yy = PyTest2()
    yy.test()
