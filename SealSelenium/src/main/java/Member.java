/**
 * Created by Linty on 2/19/2017.
 */
public class Member {
    private String account = null;

    private String realName = null;

    private Gender gender = null;

    private int dept = 0;

    private int role = 0;

    private String password = null;

    private String email = null;

    public String getAccount() {
        return account;
    }

    public void setAccount(String account) {
        this.account = account;
    }

    public String getRealName() {
        return realName;
    }

    public void setRealName(String realName) {
        this.realName = realName;
    }

    public Gender getGender() {
        return gender;
    }

    /**
     * set Gender Property
     *
     * @param gender
     */
    public void setGender(Gender gender) {
        this.gender = gender;
    }

    public int getDept() {
        return dept;
    }

    public void setDept(int dept) {
        this.dept = dept;
    }

    public int getRole() {
        return role;
    }

    public void setRole(int role) {
        this.role = role;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }


    /**
     * 枚举类型
     * 定制一个类型，性别
     */
    public enum Gender {
        Male,
        Female
    }

}


