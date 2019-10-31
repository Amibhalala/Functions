var aws = require('aws-sdk');
var codecommit = new aws.CodeCommit({
    apiVersion: '2015-04-13'
});

console.log('Loading function');

const https = require('https');
const url = require('url');
// to get the slack hook url, go into slack admin and create a new "Incoming Webhook" integration
const slack_url = 'https://hooks.slack.com/services/...';
const slack_req_opts = url.parse(slack_url);
slack_req_opts.method = 'POST';
slack_req_opts.headers = {
    'Content-Type': 'application/json'
};

exports.handler = function(event, context) {
    console.log('From SNS:', event.Records[0]);
    (event.Records || []).forEach((rec) => {
        console.log('Stream record: ', typeof rec);
        var message = JSON.parse(rec.Sns.Message);
         console.log('Stream record message: ', message);
         console.log('Stream record codecommit: ', message.Records[0].codecommit);
    if (rec.Sns) {
        var details =  message.Records[0].codecommit.references[0];
        var commitId = details.commit;
        var ref = details.ref;
        var repository = message.Records[0].eventSourceARN.split(":")[5];
        console.log(details);

        console.log("Repo " + repository + ", commit ID " + commitId + " on " + ref);

        var params = {
            commitId: commitId,
            repositoryName: repository
        };

        codecommit.getCommit(params, function(err, data) {
             console.log("commitdata: ",data);
            if (err) console.log(err, err.stack); // an error occurred
            else {
                var commitMessage = data.commit.message;
                var authorName = data.commit.author.name;
                var committerName = data.commit.committer.name;
                console.log(authorName);
                console.log(committerName);
                console.log(commitMessage);

              
                    var req = https.request(slack_req_opts, function(res) {
                        if (res.statusCode === 200) {
                            context.succeed('posted to slack');


                        } else {
                            context.fail('status code: ' + res.statusCode);
                        }
                    });
                    var url = "https://" + message.Records[0].awsRegion + ".console.aws.amazon.com/codesuite/codecommit/repositories/" + repository + "/commit/" + commitId + "?region=" + message.Records[0].awsRegion;
                    req.on('error', function(e) {
                        console.log('problem with request: ' + e.message);
                        context.fail(e.message);
                    });

                    
                    var text= "CommitMessage: " + commitMessage + "\n Repository: " + repository + "\n CommitId: " + commitId + "\n Ref: " + ref + "\n Authorname:  " + authorName + "\n CommitUrl: " + url ;
                    req.write(JSON.stringify({
                         text: text,
                         channel: '#codecommit'
                    }));


                    req.end();
                }
            }


        );

}

    });
};
