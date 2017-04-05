import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.firefox.FirefoxProfile;
import org.openqa.selenium.support.ui.Select;

import java.io.File;
import java.util.concurrent.TimeUnit;

/**
 * Created by Linty on 3/5/2017.
 */
public class BoxDriver {

    /**
     * 成员变量，被封装的 webdriver
     */
    WebDriver baseDriver = null;
    String byChar = null;


    /**
     * 构造方法
     * 实例化 BoxDriver的时候，
     * BoxDriver bd = new BoxDriver()
     * 执行本方法，产生一个对象，bd
     *
     * @param byChar: 定位符的分隔符
     */
    public BoxDriver(String byChar, String profile) {

        FirefoxProfile ffp = null;
        // 如果有传递 firefox profile 的路径
        if (profile != null) {
            // 用 路径 实例化一个 FirefoxProfile
            File f = new File(profile);
            ffp = new FirefoxProfile(f);
        }
        this.baseDriver = new FirefoxDriver(ffp);
        this.byChar = byChar;
    }

    /**
     * 私有方法： 根据外面传递的 定位符，分析定位符的类型，然后定位到元素并返回该元素
     *
     * @param selector
     * @return
     */
    private WebElement locateElement(String selector) {
        WebElement we;
        // 如果定位符中 有 分隔符，那么就从分隔符处分成两段
        // 第一段是By
        // 第二段是真正的定位符
        // 如果没有分隔符，就默认用 id 定位
        if (!selector.contains(this.byChar)) {
            // 用 id 定位
            we = this.baseDriver.findElement(By.id(selector));
        } else {
            // 用 分隔符 分成两个部分
            String by = selector.split(this.byChar)[0];
            String value = selector.split(this.byChar)[1];
            we = findElementByChar(by, value);
        }

        return we;
    }

    /**
     * 根据具体的 by 和 value，进行元素定位，并返回该元素
     *
     * @param by
     * @param value
     * @return
     */
    private WebElement findElementByChar(String by, String value) {
        WebElement we = null;
        switch (by.toLowerCase()) {
            case "id":
            case "i":
                we = this.baseDriver.findElement(By.id(value));
                break;

            case "css_selector":
            case "css":
            case "cssselector":
            case "s":
                we = this.baseDriver.findElement(By.cssSelector(value));
                break;

            case "xpath":
            case "x":
                we = this.baseDriver.findElement(By.xpath(value));
                break;

            case "link_text":
            case "link":
            case "text":
            case "linktext":
            case "l":
                we = this.baseDriver.findElement(By.linkText(value));
                break;

            case "name":
            case "n":
                we = this.baseDriver.findElement(By.name(value));
                break;

            case "class_name":
            case "class":
            case "classname":
            case "c":
                we = this.baseDriver.findElement(By.className(value));
                break;

            case "tag_name":
            case "tag":
            case "tagname":
            case "t":
                we = this.baseDriver.findElement(By.tagName(value));
                break;

            case "partial_link_text":
            case "partial":
            case "partiallinktext":
            case "p":
                we = this.baseDriver.findElement(By.partialLinkText(value));
                break;
        }

        return we;
    }

    // 成员方法

    /**
     * 导航到指定的url
     *
     * @param url
     */
    public void navigate(String url) {
        this.baseDriver.get(url);
    }

    /**
     * 点击指定的 selector
     * 约定 selector 是css selector
     *
     * @param selector
     */
    public void click(String selector) {
        this.locateElement(selector).click();
    }

    /**
     * 定位到指定的元素，并且返回 text
     *
     * @param selector
     * @return
     */
    public String getText(String selector) {
        return this.locateElement(selector).getText();
    }

    /**
     * 定位到指定过的元素，并且把 text 填写进去
     *
     * @param selector
     * @param text
     */
    public void type(String selector, String text) {
        WebElement we = this.locateElement(selector);
        we.clear();
        we.sendKeys(text);
    }

    /**
     * 用css selector 定位到 frame 并切换进去
     *
     * @param selector
     */
    public void switchToFrame(String selector) {
        WebElement we = this.locateElement(selector);
        this.baseDriver.switchTo().frame(we);

    }

    /**
     * 切换到默认的frame
     */
    public void switchToDefault() {
        this.baseDriver.switchTo().defaultContent();
    }

    /**
     * 定位到指定的 select，并选择 index
     *
     * @param selector
     * @param index
     */
    public void selectByIndex(String selector, int index) {
        WebElement we = this.locateElement(selector);
        Select s = new Select(we);
        s.selectByIndex(index);
    }

    /**
     * 定位到指定的 select，并选择 value
     *
     * @param selector
     * @param value
     */
    public void selectByValue(String selector, String value) {
        WebElement we = this.locateElement(selector);
        Select s = new Select(we);
        s.selectByValue(value);
    }

    public void clearCookies() {
        this.baseDriver.manage().deleteAllCookies();
    }

    public void quit() {
        this.baseDriver.quit();
    }

    public String getCurrentUrl() {
        return this.baseDriver.getCurrentUrl();
    }

    /**
     * accept the alert
     */
    public void acceptAlert() {
        if (baseDriver != null) {
            this.baseDriver.switchTo().alert().accept();
        }
    }

    /**
     * dismiss alert
     */
    public void dismissAlert() {
        if (baseDriver != null) {
            this.baseDriver.switchTo().alert().dismiss();
        }
    }

    /**
     * implicitly wait for seconds
     *
     * @param seconds selector should be passed by an example with "i,xxx"
     */
    public void implicitlyWait(int seconds) {
        if (this.baseDriver != null) {
            this.baseDriver.manage().timeouts().implicitlyWait(seconds, TimeUnit.SECONDS);
        }
    }

    /**
     * get specific attribute of element located by selector
     *
     * @param selector  selector should be passed by an example with "i,xxx"
     * @param attribute attribute to get
     * @return String
     */
    public String getAttribute(String selector, String attribute) {
        WebElement we = this.locateElement(selector);
        if (we != null) {
            return we.getAttribute(attribute);
        }

        return null;
    }

    /**
     * get whether display or not of element located by selector
     *
     * @param selector selector should be passed by an example with "i,xxx"
     * @return boolean
     */
    public boolean getDisplay(String selector) {

        WebElement we = this.locateElement(selector);
        if (we != null) {
            return we.isDisplayed();
        }
        return false;
    }

}
