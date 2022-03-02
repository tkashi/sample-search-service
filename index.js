const express = require('express')
const app = express()
const { KendraClient, QueryCommand } = require('@aws-sdk/client-kendra')
const { query } = require('express')
const port = 3000

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.get('/api/search', async (req, res, next) => {
    console.log(req.query);
    const client = new KendraClient({ region: 'us-east-1'})
    const params = {
        QueryText: req.query.keyword,
        IndexId: 'ed40aa0a-496b-4c2f-bcb6-3d9cd7bb17f5'
    };

    // if (req.query.categories && req.query.categories.length > 0) {
    //   params.AttributeFilter = {"ContainsAny": { "Key": "_category", "Value": { "StringListValue": [req.query.categories] }}}
    // }

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
        res.json(data.ResultItems)
      } catch (error) {
        next (error)
      }
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})