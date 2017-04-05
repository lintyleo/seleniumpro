import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.Select;

/**
 * Created by Linty on 2/12/2017.
 * 然之系统给的业务类
 * 作为公共的模块，可以给所有的用例使用
 */
public class RanzhiCommon {

    // 声明全局变量，每个方法都可以用下面的变量。
    private WebDriver baseDriver = null;
    private String baseUrl = null;

    // 声明常量，不可以再次被修改
    private final String APP_ADMIN_SELECTOR = "#s-menu-superadmin > button > i";
    private final String ADMIN_ADD_MEMBER_BUTTON_SELECTOR = "#shortcutBox > div > div:nth-child(1) > div > a > h3";
    private final String ADMIN_FRAME_SELECTOR = "#iframe-superadmin";
    private final String ADMIN_ADD_MEMBER_EDIT_ACCOUNT = "#account";
    private final String ADMIN_ADD_MEMBER_EDIT_REALNAME = "#realname";
    private final String ADMIN_ADD_MEMBER_EDIT_GENDER_FEMALE = "#genderf";
    private final String ADMIN_ADD_MEMBER_EDIT_GENDER_MALE = "#genderm";
    private final String ADMIN_ADD_MEMBER_EDIT_DEPARTMENT = "#dept";
    private final String ADMIN_ADD_MEMBER_EDIT_ROLE = "#role";
    private final String ADMIN_ADD_MEMBER_EDIT_PASSWORD = "#password1";
    private final String ADMIN_ADD_MEMBER_EDIT_PASSWORD_REPEAT = "#password2";
    private final String ADMIN_ADD_MEMBER_EDIT_EMAIL = "#email";
    private final String ADMIN_ADD_MEMBER_SUBMIT_SELETOR = "#submit";


    /**
     * 打开然之登录页面的业务
     */
    void openPage() throws InterruptedException {
        WebDriver driver = this.baseDriver;
        driver.get(this.baseUrl);
        Thread.sleep(2000);
    }

    /**
     * 然之的切换语言的业务
     */
    String changeLanguage(String lang) throws InterruptedException {
        WebDriver driver = this.baseDriver;
        // 点击语言按钮
        driver.findElement(By.cssSelector("#langs > button")).click();
        Thread.sleep(500);
        // 用Css Selector 选择 语言
        String langNumber = "";
        switch (lang) {
            case "en":
                langNumber = "3";
                break;
            case "zh_CN":
                langNumber = "1";
                break;
            case "zh_TW":
                langNumber = "2";
                break;
        }
        String langSelect = "#langs > ul > li:nth-child(" + langNumber + ") > a";
        driver.findElement(By.cssSelector(langSelect)).click();
        // 浏览器需要刷新，等待2秒钟
        Thread.sleep(2000);

        // 找到语言按钮的文字，返回给调用者
        String language =
                driver.findElement(By.cssSelector("#langs > button")).getText();

        return language;
    }

    /**
     * 然之的登录的业务
     */
    void logIn(String account, String password) throws InterruptedException {
        WebDriver driver = this.baseDriver;
        driver.findElement(By.id("account")).sendKeys(account);
        driver.findElement(By.id("password")).sendKeys(password);
        driver.findElement(By.id("submit")).click();
        // 点击登录按钮后，需要等待浏览器刷新
        Thread.sleep(2000);
    }

    /**
     * 构造方法
     * 把自己这个类（设计、模板）转换成对象的时候，调用
     *
     * @param driver 调用该业务用的 浏览器（司机）
     * @param url    调用该业务用的 地址
     */
    public RanzhiCommon(WebDriver driver, String url) {
        this.baseDriver = driver;
        this.baseUrl = url;
    }

    void logOut(String lang) throws InterruptedException {
        WebDriver driver = this.baseDriver;

        // 点头像（左下角）
        driver.findElement(By.cssSelector("#start > div")).click();
        Thread.sleep(500);

        // 在弹出的上下文菜单，选择文字(根据语言）
        // 1. 中文简体：退出
        // 2. 中文繁体：退出
        // 3. English：Logout
        // 用Switch来写
        String exitText = "";
        switch (lang) {
            case "en":
                exitText = "Logout";
                break;
            case "zh_CN":
            case "zh_TW":
                exitText = "退出";
                break;
        }
        driver.findElement(By.linkText(exitText)).click();
        Thread.sleep(2000);

    }


    void addContact() throws InterruptedException {
        // 点客户管理按钮
        WebDriver driver = this.baseDriver;
        driver.findElement(By.cssSelector("#s-menu-1 > button > img")).click();
        Thread.sleep(2000);

        // 点 上面 联系人 菜单
        // 这里涉及了iframe操作
        // 1. 找到 iframe 元素对应的 css selector，存到变量中
        // 2. 调用driver.switchTo().frame(刚刚被找到的iframe元素)

        WebElement elementFrame = driver.findElement(By.cssSelector("#iframe-1"));
        driver.switchTo().frame(elementFrame);

        // 进入紫禁城以后，正常操作
        driver.findElement(By.cssSelector("#mainNavbar > div.collapse.navbar-collapse > ul > li:nth-child(6) > a")).click();
        Thread.sleep(2000);

        // TODO：继续填写表单

        // 在紫荆城结束以后必须退出来
        // switchTo().frame()和 switchTo().defaultContent() 成对出现
        driver.switchTo().defaultContent();


    }


    void selectAdminApp() throws InterruptedException {
        WebDriver driver = this.baseDriver;
        // 点击齿轮按钮
        driver.findElement(By.cssSelector(this.APP_ADMIN_SELECTOR)).click();
        Thread.sleep(1000);
    }

    void clickAddMemberButton() throws InterruptedException {
        WebDriver driver = this.baseDriver;
        // 添加成员按钮 在 紫禁城中
        WebElement frameAdmin = driver.findElement(By.cssSelector(this.ADMIN_FRAME_SELECTOR));
        driver.switchTo().frame(frameAdmin);

        // 点击添加成员按钮
        driver.findElement(By.cssSelector(this.ADMIN_ADD_MEMBER_BUTTON_SELECTOR)).click();
        Thread.sleep(1000);

        // 办完事儿后，退出 紫禁城
        // 必须 进退 成对出现
        driver.switchTo().defaultContent();
    }

    void addMemberData(Member member) throws InterruptedException {
        WebDriver driver = this.baseDriver;
        // 添加成员按钮 在 紫禁城中
        WebElement frameAdmin = driver.findElement(By.cssSelector(this.ADMIN_FRAME_SELECTOR));
        driver.switchTo().frame(frameAdmin);

        // 开始填表单
        // 用户名
        WebElement elementAccount = driver.findElement(By.cssSelector(this.ADMIN_ADD_MEMBER_EDIT_ACCOUNT));
        elementAccount.clear();
        elementAccount.sendKeys(member.getAccount());

        // 真实姓名
        WebElement elementRealName = driver.findElement(By.cssSelector(this.ADMIN_ADD_MEMBER_EDIT_REALNAME));
        elementRealName.clear();
        elementRealName.sendKeys(member.getRealName());

        // 性别
        if (member.getGender() == Member.Gender.Female) {
            driver.findElement(By.cssSelector(this.ADMIN_ADD_MEMBER_EDIT_GENDER_FEMALE)).click();
        } else {
            driver.findElement(By.cssSelector(this.ADMIN_ADD_MEMBER_EDIT_GENDER_MALE)).click();
        }
        // 部门
        WebElement elementDepartment = driver.findElement(By.cssSelector(this.ADMIN_ADD_MEMBER_EDIT_DEPARTMENT));
        Select objectDepartment = new Select(elementDepartment);
        objectDepartment.selectByIndex(member.getDept());

        // 角色
        // 是个Select元素，不可以直接操作
        WebElement elementRole = driver.findElement(By.cssSelector(this.ADMIN_ADD_MEMBER_EDIT_ROLE));
        // elementRole 不可以直接操作
        // 把 elementRole 构造成一个 Select() 对象
        Select objectRole = new Select(elementRole);
        objectRole.selectByIndex(member.getRole());


        // 密码
        WebElement elementPassword = driver.findElement(By.cssSelector(this.ADMIN_ADD_MEMBER_EDIT_PASSWORD));
        elementPassword.clear();
        elementPassword.sendKeys(member.getPassword());

        // 重复密码
        WebElement elementPasswordRepeat = driver.findElement(By.cssSelector(this.ADMIN_ADD_MEMBER_EDIT_PASSWORD_REPEAT));
        elementPasswordRepeat.clear();
        elementPasswordRepeat.sendKeys(member.getPassword());

        // 邮箱
        WebElement elementEmail = driver.findElement(By.cssSelector(this.ADMIN_ADD_MEMBER_EDIT_EMAIL));
        elementEmail.clear();
        elementEmail.sendKeys(member.getEmail());

        // 点击保存按钮
        driver.findElement(By.cssSelector(this.ADMIN_ADD_MEMBER_SUBMIT_SELETOR)).click();

        Thread.sleep(5000);

        driver.switchTo().defaultContent();


    }
}
