import org.testng.TestNG;

import java.util.ArrayList;
import java.util.List;

/**
 * Created by Linty on 2017/3/11.
 */
public class Main {
    public static void main(String[] args) {
        TestNG testNG = new TestNG();
        List<String> suites = new ArrayList<>();
        suites.add("testng.xml");
        testNG.setTestSuites(suites);
        testNG.run();
    }
}
