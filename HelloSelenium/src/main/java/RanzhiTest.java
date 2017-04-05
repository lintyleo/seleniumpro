import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.firefox.FirefoxDriver;


/**
 * Created by we on 16-12-25.
 * Java RanzhiTest 类
 * 拥有一个能力 logIn()
 */
public class RanzhiTest {

    /**
     * 登录染之系统
     *
     * @throws InterruptedException
     */
    void logIn() throws InterruptedException {

        // 声明 司机，司机是一个火狐类的对象
        // java 需要用 new 关键字来实例化对象
        // python 省略了 new
        // 无论 java 还是 python，都需要 括号 ()
        // () 代表构造方法
        WebDriver driver = new FirefoxDriver();

        // 司机去打开网站
        driver.get("http://localhost/ranzhi/www/");

        // 线程停止 3000 毫秒
        // 需要点 Thread 左边的红灯，选第一个 "add exceptions to ..."
        Thread.sleep(3000);

        // 选择 用户名 密码 并依次输入 admin 和 123456
        driver.findElement(By.cssSelector("#account")).sendKeys("admin");
        driver.findElement(By.cssSelector("#password")).sendKeys("123456");

        // 选择 登录 按钮，并点击 click
        driver.findElement(By.cssSelector("#submit")).click();
        Thread.sleep(10000);


        // 选择左下角的 头像 并点击
        driver.findElement(By.cssSelector("#start > div")).click();
        Thread.sleep(1000);

        // 选择 “退出” 并点击
        driver.findElement(By.cssSelector("#startMenu > li:nth-child(10) > a")).click();
        Thread.sleep(10000);

        // 司机退出 休息去
        driver.quit();

    }

    //psvm + tab键
    // 主方法入口
    public static void main(String[] args) {
        // 声明一个 RanzhiTest类的对象
        RanzhiTest rTest = new RanzhiTest();
        try {
            // 用对象 rTest 的能力
            // 需要点 rTest 左边的红灯，选第一个 "add exceptions to ..."
            rTest.logIn();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
}
