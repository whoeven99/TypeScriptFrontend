import { pool, testConnection } from "../mysql.server";

interface UserDO {
  shopName: string;
  firstName: string;
  lastName: string;
  userTag: string;
  email: string;
  accessToken: string;
}

export class UserService {
  // 获取用户信息
  async getUserByName(shopName: string): Promise<UserDO | null> {
    try {
      const getUserByNameDateStart = new Date();
      const result = await pool
        .request()
        .input("shopName", shopName)
        .query(
          "SELECT shop_name, first_name, last_name, user_tag, email FROM Users WHERE shop_name = @shopName",
        );
      const getUserByNameDateEnd = new Date();
      console.log("getUserByNameDateEnd - getUserByNameDateStart: ", getUserByNameDateEnd.getTime() - getUserByNameDateStart.getTime());
      if (result.recordset.length > 0) {
        await this.updateUserLoginTime(shopName);
        return result.recordset[0] || null;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error getting user:", error);
      return null;
    }
  }

  // 更新用户登录时间
  async updateUserLoginTime(shopName: string): Promise<void> {
    try {
      const updateUserLoginTimeDateStart = new Date();
      await pool
        .request()
        .input("shopName", shopName)
        .query(
          "UPDATE Users SET login_time = GETDATE() WHERE shop_name = @shopName",
        );
      const updateUserLoginTimeDateEnd = new Date();
      console.log("updateUserLoginTimeDateEnd - updateUserLoginTimeDateStart: ", updateUserLoginTimeDateEnd.getTime() - updateUserLoginTimeDateStart.getTime());
    } catch (error) {
      console.error("Error updating login time:", error);
      throw error;
    }
  }

  // 更新用户Token
  async updateUserTokenByShopName(
    shopName: string,
    accessToken: string,
  ): Promise<void> {
    try {
      await pool
        .request()
        .input("shopName", shopName)
        .input("accessToken", accessToken)
        .query(
          "UPDATE Users SET access_token = @accessToken WHERE shop_name = @shopName",
        );
    } catch (error) {
      console.error("Error updating user token:", error);
      throw error;
    }
  }

  // 添加新用户
  async addUser(user: UserDO): Promise<number> {
    try {
      const result = await pool
        .request()
        .input("shopName", user.shopName)
        .input("firstName", user.firstName)
        .input("lastName", user.lastName)
        .input("userTag", user.userTag)
        .input("email", user.email)
        .input("accessToken", user.accessToken).query(`
          INSERT INTO Users (
            shop_name, 
            first_name, 
            last_name, 
            user_tag, 
            email, 
            access_token, 
            login_time
          ) VALUES (
            @shopName, 
            @firstName, 
            @lastName, 
            @userTag, 
            @email, 
            @accessToken, 
            GETDATE()
          )
        `);

      return result.rowsAffected[0];
    } catch (error) {
      console.error("Error adding user:", error);
      return 0;
    }
  }

  // 获取用户并更新登录时间
  async getUser(shopName: string) {
    try {
      // 更新登录时间
    //   await this.updateUserLoginTime(shopName);
      // 获取用户信息
      return await this.getUserByName(shopName);
    } catch (error) {
      console.error("Error in getUser:", error);
      return null;
    }
  }
}
