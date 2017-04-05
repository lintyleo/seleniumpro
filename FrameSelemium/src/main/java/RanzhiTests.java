import org.apache.commons.csv.CSVRecord;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.testng.Assert;
import org.testng.annotations.AfterTest;
import org.testng.annotations.BeforeTest;
import org.testng.annotations.Test;

/**
 * Created by Linty on 2/12/2017.
 * 然之系统的测试用例的类
 */
public class RanzhiTests {
    // 声明两个全局变量，每个方法都可以用下面的变量。
    private WebDriver baseDriver = null;
    private String baseUrl = null;
    private RanzhiCommon common = null;

    /**
     * 测试前准备
     * setUp的名字可以任意取，需要符合小骆驼命名规范
     */
    @BeforeTest
    public void setUp() {
        // this. 可以省略
        // 表明是全局变量
        this.baseDriver = new FirefoxDriver();
        this.baseUrl = "http://localhost:808/ranzhi/www/";
        // 测试之前，清理浏览器的Cookie
        this.baseDriver.manage().deleteAllCookies();
        // 在测试之前，准备好业务模块的对象，方面每一个测试方法（步骤）进行调用
        // 实例化一个然之的业务类的对象
        // 必须把 baseDriver 传给业务类
        // 在业务类变成对象的过程中，把baseDriver打造到骨子里去
        this.common = new RanzhiCommon(this.baseDriver, this.baseUrl);
    }

    @AfterTest
    public void tearDown() {
        this.baseDriver.quit();
    }

    /**
     * 具体的测试用例：抽离的业务代码
     * 1. 系统改成英文
     * 2. 用Admin登录系统
     * 方法的类型得是 public
     */
    @Test
    public void testLogInByAdmin() throws InterruptedException {

        RanzhiCommon common = this.common;
        // 调用打开然之登录页面的业务
        common.openPage();
        // 调用然之的切换语言的业务，切换为英文
        // 该方法有返回值，用变量把返回值接住
        String actualLanguage = common.changeLanguage("en");

        // 加断言，是否变成英文：检查 actualLanguage 是不是 = "English"
        Assert.assertEquals(actualLanguage, "English");

        // 调用然之的登录的业务，输入 admin 和 123456
        common.logIn("admin", "123456");
        // 加断言，是否登录成功
        String expectedUrl = this.baseUrl + "sys/index.html";
        Assert.assertEquals(this.baseDriver.getCurrentUrl(), expectedUrl);
    }

    @Test
    public void testLogInByCsv() throws InterruptedException {
        // 调用业务模块的对象
        RanzhiCommon common = this.common;
        // 打开 Csv文件
        CsvUtility utility = new CsvUtility();
        Iterable<CSVRecord> csvData =
                utility.readCsvFile("src/main/resources/userListWithHeader.csv");

        // 布尔型 true false
        boolean isFirstLine = true;
        // 循环每一个行，接下来根据每一行的值（数据），进行测试
        for (CSVRecord row : csvData) {
            if (isFirstLine) {
                isFirstLine = false;
                continue;
                // continue的作用
                // 当前循环到此为止，直接进入下一条循环
            }
            String account = row.get(0);
            String password = row.get(1);
            String lang = row.get(2);

            // 打开然之的登录页面
            common.openPage();

            // 切换语言，加断言
            String actualLanguage = common.changeLanguage(lang);
            // 加断言，是否变成英文：检查 actualLanguage 是不是 = "English"
            String ExpectedDisplay = "";
            switch (lang) {
                case "en":
                    ExpectedDisplay = "English";
                    break;
                case "zh_CN":
                    ExpectedDisplay = "简体";
                    break;
                case "zh_TW":
                    ExpectedDisplay = "繁体";
                    break;
            }
            Assert.assertEquals(actualLanguage, ExpectedDisplay);


            // 登录，加断言
            common.logIn(account, password);
            // 加断言，是否登录成功
            String expectedUrlAfterLogIn = this.baseUrl + "sys/index.html";
            Assert.assertEquals(this.baseDriver.getCurrentUrl(), expectedUrlAfterLogIn);

            // 登出，加断言
            common.logOut(lang);
            // 加断言，是否登出成功
            String expectedUrlAfterLogOut = this.baseUrl + "sys/user-login.html";
            Assert.assertEquals(this.baseDriver.getCurrentUrl(), expectedUrlAfterLogOut);

        }


    }


}
