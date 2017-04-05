import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.testng.Assert;
import org.testng.annotations.AfterTest;
import org.testng.annotations.BeforeTest;
import org.testng.annotations.Test;


/**
 * Created by Linty on 1/8/2017.
 * 使用 @BeforeTest 和 @AfterTest 进行测试框架操作
 * 如果直接运行整个测试，运行步骤如下
 * 首先运行 @BeforeTest
 * 然后运行 test01ChangeLanguage
 * 接着运行 test02LogIn
 * 最后运行 @AfterTest
 */
public class RanzhiMainTest {
    // 声明两个全局变量，每个方法都可以用下面的变量。
    private WebDriver baseDriver = null;
    private String baseUrl = null;

    /**
     * 测试登录
     * 需要用 @Test 注解进行标注
     * 这样 不用main()方法 便可直接运行测试
     *
     * @throws InterruptedException
     */
    @Test
    public void test02LogIn() throws InterruptedException {
        WebDriver driver = this.baseDriver;
        driver.get(this.baseUrl);
        Thread.sleep(2000);

        driver.findElement(By.id("account")).sendKeys("admin");
        driver.findElement(By.id("password")).sendKeys("123456");
        driver.findElement(By.id("submit")).click();
        // 点击登录按钮后，需要等待浏览器刷新
        Thread.sleep(2000);
        String expectedUrl = "http://localhost/ranzhi/www/sys/index.html";
        // driver.getCurrentUrl() -- 获取当前的浏览器URL
        Assert.assertEquals(driver.getCurrentUrl(), expectedUrl);

    }

    /**
     * 测试切换语言
     * 把系统语言切换成 English
     * 然后查询 语言的按钮 是不是变成了 English
     *
     * @throws InterruptedException
     */
    @Test
    public void test01ChangeLanguage() throws InterruptedException {
        WebDriver driver = this.baseDriver;
        driver.get(this.baseUrl);
        Thread.sleep(2000);

        // 点击语言按钮
        driver.findElement(By.cssSelector("#langs > button")).click();
        Thread.sleep(500);
        // 用Css Selector 选择 英文
        driver.findElement(By.cssSelector("#langs > ul > li:nth-child(3) > a")).click();
        // 浏览器需要刷新，等待2秒钟
        Thread.sleep(2000);

        // 检查按钮上的字是不是变成了 English
        String expected_language = "English";
        String actual_language =
                driver.findElement(By.cssSelector("#langs > button")).getText();

        Assert.assertEquals(actual_language, expected_language);

    }

    /**
     * 测试前置条件
     * 在所有的测试开始前 执行一次
     */
    @BeforeTest
    public void setUp() {
        this.baseDriver = new FirefoxDriver();
        this.baseUrl = "http://localhost/ranzhi/www/";
    }

    /**
     * 测试清理操作
     * 在所有的测试结束后 执行一次
     */
    @AfterTest
    public void tearDown() {
        this.baseDriver.quit();
    }
}
