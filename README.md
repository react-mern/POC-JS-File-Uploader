# File Upload POC

This proof of concept (POC) demonstrates file upload functionality using JavaScript events, with a focus on handling both single-part and multipart uploads to an AWS S3 bucket. The `UploadManager` class encapsulates the logic for managing uploads, handling progress, and ensuring error recovery. The class is globally accessible via the `window` object, simplifying integration across different parts of the application.

### Live Link : [File-Uploader](https://js-file-uploader.vercel.app/)

## Why This Approach?

1. **Efficient File Management:**: Full control over upload logic without unnecessary dependencies.
2. **Reduced Overhead**: Keeps the project lightweight by avoiding bulky libraries with unnecessary features.
3. **Scalability**: Can be easily optimized and scaled based on application needs.
4. **No Lock-in**: Avoids dependence on third-party libraries, offering flexibility for future changes.
5. **Customizable:** Can be extended or modified to fit various use cases.

## Quick Start

### AWS Configuration

1. **Access Security Credentials**
   - Navigate to "My Security Credentials" in your AWS account.
   - Create a new Access Key and save the Access Key ID and Secret Access Key.

2. **Configure S3 Bucket**
   - Create a new S3 bucket in the [AWS S3 Console](https://s3.console.aws.amazon.com/).
   - Set bucket permissions:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Sid": "AddPerm",
           "Effect": "Allow",
           "Principal": "*",
           "Action": [
             "s3:PutObject",
             "s3:PutObjectAcl",
             "s3:GetObject"
           ],
           "Resource": "arn:aws:s3:::<Your-Bucket-Name>/*"
         }
       ]
     }
     ```
   - Enable CORS:
     ```json
     [
      {
          "AllowedHeaders": [
              "Authorization",
              "x-amz-date",
              "x-amz-content-sha256",
              "content-type"
          ],
          "AllowedMethods": [
              "GET",
              "PUT",
              "POST"
          ],
          "AllowedOrigins": [
              "*",
              "<Add your origins>"
          ],
          "ExposeHeaders": [
              "ETag",
              "Location"
          ],
          "MaxAgeSeconds": 3000
      },
      {
          "AllowedHeaders": [],
          "AllowedMethods": [
              "GET",
              "POST"
          ],
          "AllowedOrigins": [
              "*"
          ],
          "ExposeHeaders": [],
          "MaxAgeSeconds": 3000
      }
     ]
     ```


### Installation
1. Clone the repository and install dependencies:
   ```bash
   git clone https://github.com/react-mern/POC-JS-File-Uploader.git
   cd POC-JS-File-Uploader
   npm install

2. **Set up environment variables**

   Create a `.env` file in the root of your project and add the following variables:
   ```bash
   AWS_REGION="<Your-AWS-Region>"
   AWS_ACCESS_KEY_ID="<Your-AWS-Access-Key-ID>"
   AWS_SECRET="<Your-AWS-Secret-Access-Key>"
   AWS_BUCKET="<Your-AWS-S3-Bucket-Name>"

   NEXT_PUBLIC_API_URL="<Your-APP-URL>"

3. **Run the application**
   ```bash
   npm run dev
## Conclusion

In summary, this POC showcases an effective solution for file uploads using a custom `UploadManager` integrated with AWS S3. The approach emphasizes flexibility and control over file handling, allowing for both single-part and multipart uploads. By following the provided setup and configuration steps, you can quickly implement a robust file upload feature tailored to your application's needs.

Join us in shaping the future of file uploading! We're excited to see your innovative ideas and contributions to make this POC even more powerful and versatile.


## Author

**Name:** Vanshita Shah  
**Email:** vanshita.s@simformsolutions.com
 
