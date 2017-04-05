/**
 * Created by Linty on 2/12/2017.
 * 然之系统给的业务类
 * 作为公共的模块，可以给所有的用例使用
 */
public class RanzhiCommon {

    private static final String LANG_BUTTON_SELECTOR = "s,#langs > button";
    private static final String START_BUTTON_SELECTOR = "s,#start > div";
    // 声明全局变量，每个方法都可以用下面的变量。
    private BoxDriver baseDriver = null;
    private String baseUrl = null;

    // 声明常量，不可以再次被修改
    private final String APP_ADMIN_SELECTOR = "s,#s-menu-superadmin > button > i";
    private final String ADMIN_ADD_MEMBER_BUTTON_SELECTOR = "s,#shortcutBox > div > div:nth-child(1) > div > a > h3";
    private final String ADMIN_FRAME_SELECTOR = "s,#iframe-superadmin";
    private final String ADMIN_ADD_MEMBER_EDIT_ACCOUNT = "s,#account";
    private final String ADMIN_ADD_MEMBER_EDIT_REALNAME = "s,#realname";
    private final String ADMIN_ADD_MEMBER_EDIT_GENDER_FEMALE = "s,#genderf";
    private final String ADMIN_ADD_MEMBER_EDIT_GENDER_MALE = "s,#genderm";
    private final String ADMIN_ADD_MEMBER_EDIT_DEPARTMENT = "s,#dept";
    private final String ADMIN_ADD_MEMBER_EDIT_ROLE = "s,#role";
    private final String ADMIN_ADD_MEMBER_EDIT_PASSWORD = "s,#password1";
    private final String ADMIN_ADD_MEMBER_EDIT_PASSWORD_REPEAT = "s,#password2";
    private final String ADMIN_ADD_MEMBER_EDIT_EMAIL = "s,#email";
    private final String ADMIN_ADD_MEMBER_SUBMIT_SELETOR = "s,#submit";


    /**
     * 打开然之登录页面的业务
     */
    void openPage() throws InterruptedException {
        BoxDriver driver = this.baseDriver;
        driver.navigate(this.baseUrl);
        Thread.sleep(2000);
    }

    /**
     * 然之的切换语言的业务
     */
    String changeLanguage(String lang) throws InterruptedException {
        BoxDriver driver = this.baseDriver;
        // 点击语言按钮
        driver.click(LANG_BUTTON_SELECTOR);
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
        String langSelect = "s,#langs > ul > li:nth-child(" + langNumber + ") > a";
        driver.click(langSelect);
        // 浏览器需要刷新，等待2秒钟
        Thread.sleep(2000);

        // 找到语言按钮的文字，返回给调用者
        String language =
                driver.getText(LANG_BUTTON_SELECTOR);

        return language;
    }

    /**
     * 然之的登录的业务
     */
    void logIn(String account, String password) throws InterruptedException {
        BoxDriver driver = this.baseDriver;
        driver.type("account", account);
        driver.type("password", password);
        driver.click("submit");
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
    public RanzhiCommon(BoxDriver driver, String url) {
        this.baseDriver = driver;
        this.baseUrl = url;
    }

    void logOut(String lang) throws InterruptedException {
        BoxDriver driver = this.baseDriver;

        // 点头像（左下角）
        driver.click(START_BUTTON_SELECTOR);
        Thread.sleep(500);

        // 在弹出的上下文菜单，选择文字(根据语言）
        // 1. 中文简体：退出
        // 2. 中文繁体：退出
        // 3. English：Logout
        // 用Switch来写
        String exitText = "";
        switch (lang) {
            case "en":
                exitText = "l,Logout";
                break;
            case "zh_CN":
            case "zh_TW":
                exitText = "l,退出";
                break;
        }
        driver.click(exitText);
        Thread.sleep(2000);

    }


    void selectAdminApp() throws InterruptedException {
        BoxDriver driver = this.baseDriver;
        // 点击齿轮按钮
        driver.click(this.APP_ADMIN_SELECTOR);
        Thread.sleep(1000);
    }

    void clickAddMemberButton() throws InterruptedException {
        BoxDriver driver = this.baseDriver;
        // 添加成员按钮 在 紫禁城中

        driver.switchToFrame(this.ADMIN_FRAME_SELECTOR);
        Thread.sleep(1000);
        // 点击添加成员按钮
        driver.click(this.ADMIN_ADD_MEMBER_BUTTON_SELECTOR);
        Thread.sleep(1000);

        // 办完事儿后，退出 紫禁城
        // 必须 进退 成对出现
        driver.switchToDefault();
    }

    void addMemberData(Member member) throws InterruptedException {
        BoxDriver driver = this.baseDriver;
        // 添加成员按钮 在 紫禁城中
        driver.switchToFrame(this.ADMIN_FRAME_SELECTOR);


        // 开始填表单
        // 用户名
        driver.type(this.ADMIN_ADD_MEMBER_EDIT_ACCOUNT, member.getAccount());


        // 真实姓名
        driver.type(this.ADMIN_ADD_MEMBER_EDIT_REALNAME, member.getRealName());

        // 性别
        if (member.getGender() == Member.Gender.Female) {
            driver.click(this.ADMIN_ADD_MEMBER_EDIT_GENDER_FEMALE);
        } else {
            driver.click(this.ADMIN_ADD_MEMBER_EDIT_GENDER_MALE);
        }
        // 部门

        driver.selectByIndex(this.ADMIN_ADD_MEMBER_EDIT_DEPARTMENT, member.getDept());

        // 角色
        driver.selectByIndex(this.ADMIN_ADD_MEMBER_EDIT_ROLE, member.getRole());


        // 密码
        driver.type(this.ADMIN_ADD_MEMBER_EDIT_PASSWORD, member.getPassword());


        // 重复密码
        driver.type(this.ADMIN_ADD_MEMBER_EDIT_PASSWORD_REPEAT, member.getPassword());


        // 邮箱
        driver.type(this.ADMIN_ADD_MEMBER_EDIT_EMAIL, member.getEmail());

        // 点击保存按钮
        driver.click(this.ADMIN_ADD_MEMBER_SUBMIT_SELETOR);

        Thread.sleep(5000);

        driver.switchToDefault();


    }
}
