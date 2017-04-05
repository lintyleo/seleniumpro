import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.testng.Assert;
import org.testng.annotations.*;


/**
 * Created by Linty on 1/8/2017.
 * 使用 @BeforeMethod 和 @AfterMethod 进行测试框架操作
 * 如果直接运行整个测试，运行步骤如下
 * 首先运行 @BeforeMethod
 * 然后运行 test01ChangeLanguage
 * 接着运行 @AfterMethod
 * 然后运行  @BeforeMethod
 * 接着运行 test02LogIn
 * 最后运行 @AfterMethod
 */
public class RanzhiMainTest2 {
    // 声明两个全局变量，每个方法都可以用下面的变量。
    WebDriver baseDriver = null;
    String baseUrl = null;

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
        Thread.sleep(2000);
        String expectedUrl = "http://localhost/ranzhi/www/sys/index.html";
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

        driver.findElement(By.cssSelector("#langs > button")).click();
        Thread.sleep(500);
        driver.findElement(By.cssSelector("#langs > ul > li:nth-child(3) > a")).click();
        Thread.sleep(2000);

        String expected_language = "English";
        String actual_language =
                driver.findElement(By.cssSelector("#langs > button")).getText();

        Assert.assertEquals(actual_language, expected_language);

    }

    /**
     * 测试前置条件
     * 在每个测试方法运行前，都需要运行一遍
     */
    @BeforeMethod
    public void setUp() {
        this.baseDriver = new FirefoxDriver();
        this.baseUrl = "http://localhost/ranzhi/www/";
    }

    /**
     * 测试清理操作
     * 在每个测试方法运行后，都需要运行一遍
     */
    @AfterMethod
    public void tearDown() {
        this.baseDriver.quit();
    }
}
