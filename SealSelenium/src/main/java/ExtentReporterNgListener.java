import com.relevantcodes.extentreports.ExtentReports;
import com.relevantcodes.extentreports.ExtentTest;
import com.relevantcodes.extentreports.LogStatus;
import com.relevantcodes.extentreports.NetworkMode;
import org.testng.*;
import org.testng.xml.XmlSuite;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.*;

/**
 * Reporter for Extent Report
 * Created by Linty on 2017/3/11.
 */
public class ExtentReporterNgListener implements IReporter {

    /**
     * 全局变量
     */
    private ExtentReports extent;

    /**
     * 重写 generateReport方法
     *
     * @param xmlSuites       测试
     * @param suites
     * @param outputDirectory 输出目录
     */
    @Override
    public void generateReport(List<XmlSuite> xmlSuites, List<ISuite> suites, String outputDirectory) {
        Date date = new Date();
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMdd_HHmmss");
        String time = formatter.format(date);

        String reportName = String.format("ExtentReportTestNG_%s.html", time);
        // 创建报告
        this.extent = new ExtentReports(
                outputDirectory + File.separator + reportName,
                true, NetworkMode.OFFLINE);

        for (ISuite suite : suites) {
            Map<String, ISuiteResult> result = suite.getResults();

            for (ISuiteResult r : result.values()) {
                ITestContext context = r.getTestContext();
                // 创建测试节点
                buildTestNodes(context.getPassedTests(), LogStatus.PASS);
                buildTestNodes(context.getFailedTests(), LogStatus.FAIL);
                buildTestNodes(context.getSkippedTests(), LogStatus.SKIP);
            }
        }

        extent.flush();
        extent.close();
    }

    private void buildTestNodes(IResultMap tests, LogStatus status) {
        ExtentTest test;

        if (tests.size() > 0) {
            for (ITestResult result : tests.getAllResults()) {
                // 测试标题
                String testTitle = result.getMethod().getMethodName();
                // 测试描述
                String testDescription = String.format("%s.%s",
                        result.getTestClass().getName(),
                        result.getMethod().getMethodName());

                // 创建测试
                test = extent.startTest(testTitle, testDescription);

                test.getTest().setStartedTime(getTime(result.getStartMillis()));
                test.getTest().setEndedTime(getTime(result.getEndMillis()));

                for (String group : result.getMethod().getGroups())
                    test.assignCategory(group);

                String message = "Test " + status.toString().toLowerCase() + "ed";

                if (result.getThrowable() != null)
                    message = result.getThrowable().getMessage();

                test.log(status, message);

                extent.endTest(test);
            }
        }
    }

    private Date getTime(long millis) {
        Calendar calendar = Calendar.getInstance();
        calendar.setTimeInMillis(millis);
        return calendar.getTime();
    }
}
