import org.testng.Assert;
import org.testng.annotations.*;

/**
 * Created by Linty on 1/8/2017.
 */
public class TestNgDemo2 {
    @Test
    public void test01() {
        System.out.println("exec test01()");
        Assert.assertEquals("abc", "abc");
    }

    @Test
    public void test06() {
        System.out.println("exec test06()");
    }

    @Test
    public void test05() {
        System.out.println("exec test05()");
        Assert.assertEquals("abcd", "abcd");
        Assert.assertEquals("ef", "ol");
        Assert.assertEquals("op", "op");

    }

    @Test
    public void test03() {
        System.out.println("exec test03()");
    }

    @Test
    public void test02() {
        System.out.println("exec test02()");
    }

    @Test
    public void test04() {
        System.out.println("exec test04()");
    }

    @BeforeMethod
    public void setUp() {
        System.out.println("测试准备");
    }

    @AfterMethod
    public void tearDown() {
        System.out.println("测试清理");
    }
}
