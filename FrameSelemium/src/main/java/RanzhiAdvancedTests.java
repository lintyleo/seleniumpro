import org.apache.commons.csv.CSVRecord;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.testng.Assert;
import org.testng.annotations.AfterTest;
import org.testng.annotations.BeforeTest;
import org.testng.annotations.Test;

import java.util.Objects;

/**
 * Created by Linty on 2/19/2017.
 * 然之测试用例：
 * 1. 测试添加用户
 * 2. 测试添加联系人
 */
public class RanzhiAdvancedTests {

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

    /**
     * 测试之后的清理
     */
    @AfterTest
    public void tearDown() {
        this.baseDriver.quit();
    }

    /**
     * 测试步骤 和 检查 添加用户
     * 1. 登录 admin
     * 2. 点击左侧边栏的 齿轮按钮 “后台管理”按钮
     * 3. 点击右边（主场景）中的 “添加用户”按钮
     * 4. 依次输入所有要填写的 表单
     * 5. 点击保存
     * 6. 检查 是否添加成功
     * 7. 退出 admin
     * 8. 登录 新添加的用户
     * 9. 检查 是否登录成功
     */
    @Test
    public void testAddMember() throws InterruptedException {

        WebDriver driver = this.baseDriver;
        RanzhiCommon common = this.common;
        // 打开 Csv文件
        CsvUtility utility = new CsvUtility();
        Iterable<CSVRecord> csvData =
                utility.readCsvFile("src/main/resources/memberListWithHeader.csv");

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
            Member member = new Member();
            member.setAccount(row.get(0));
            member.setRealName(row.get(1));
            if (Objects.equals(row.get(2), "f")) {
                member.setGender(Member.Gender.Female);
            } else {
                member.setGender(Member.Gender.Male);
            }


            member.setDept(Integer.parseInt(row.get(3)));
            member.setRole(Integer.parseInt(row.get(4)));
            member.setPassword(row.get(5));
            member.setEmail(row.get(6));

            common.openPage();
            String lang = "zh_CN";
            String expectedUrl;

            common.changeLanguage(lang);
            common.logIn("admin", "123456");

            common.selectAdminApp();
            expectedUrl = this.baseUrl + "sys/admin/";
            Assert.assertEquals(driver.getCurrentUrl(), expectedUrl, "后台管理按钮点击后页面跳转失败");
            common.clickAddMemberButton();
            expectedUrl = this.baseUrl + "sys/user-create.html";
            Assert.assertEquals(driver.getCurrentUrl(), expectedUrl, "添加成员按钮点击后页面跳转失败");
            common.addMemberData(member);
            expectedUrl = this.baseUrl + "sys/user-admin.html";
            Assert.assertEquals(driver.getCurrentUrl(), expectedUrl, "添加成员保存失败");

            common.logOut(lang);
            common.openPage();
            common.logIn(member.getAccount(), member.getPassword());
            expectedUrl = this.baseUrl + "sys/index.html";
            Assert.assertEquals(driver.getCurrentUrl(), expectedUrl, "新用户登录失败");

            common.logOut(lang);
        }


    }

}
