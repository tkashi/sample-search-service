const express = require('express')
const { query } = require('express')

const { KendraClient, QueryCommand } = require('@aws-sdk/client-kendra')
const { HttpRequest } = require("@aws-sdk/protocol-http")
const { S3RequestPresigner } = require("@aws-sdk/s3-request-presigner")
const { parseUrl } = require("@aws-sdk/url-parser")
const { Hash } = require("@aws-sdk/hash-node")
const { formatUrl } = require("@aws-sdk/util-format-url");

const getPresignedUrl = async (s3Url) => {
  console.log(s3Url);
  const presigner = new S3RequestPresigner({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      region: 'us-east-1',
      sha256: Hash.bind(null, "sha256")
  });
  // Create a GET request from S3 url.
  const signedReq = await presigner.presign(new HttpRequest(parseUrl(s3Url)));
  console.log(formatUrl(signedReq));
  return formatUrl(signedReq);
}

const app = express()
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/api/search', async (req, res, next) => {
    console.log(req.query);
    const client = new KendraClient({ region: 'us-east-1'})
    const params = {
        QueryText: req.query.keyword,
        IndexId: process.env.KENDRA_INDEX 
    };

    if (req.query.category) {
      params.AttributeFilter = {"EqualsTo": {"Key": "_category","Value": {"StringValue": req.query.category}}}
    }

    if (req.query.sort && req.query.sort == 'crated_at') {
      params.SortingConfiguration = { 
        "DocumentAttributeKey": "_created_at",
        "SortOrder": "ASC"
      }
    }

    const command = new QueryCommand(params);

    try {
        const data = await client.send(command);
        const resultItems = data.ResultItems;
        for await (item of resultItems) {
          const s3Url = item.DocumentURI;
          item.DocumentURI = await getPresignedUrl(s3Url);
        }
        res.json(resultItems)
      } catch (error) {
        next (error)
      }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})