var request = require('request');
var fs = require('fs');
var cheerio = require('cheerio');
const { get } = require('http');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/spider";

function saveBuglist(obj){
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
        if (err) throw err;
        var dbase = db.db("spider");
          dbase.collection("buglist").insertOne(obj, function(err, res) {
              if (err) throw err;
              //console.log("BugDetail插入成功");
              db.close();
          });
      });
}
function saveBugpatch(obj,bugid){
    MongoClient.connect(url, { useNewUrlParser: true }, function(err, db) {
        if (err) throw err;
        var dbase = db.db("spider");
          dbase.collection("buglist").updateOne({"cnnvd": bugid},{$push:{"patch":obj}}, function(err, res) {
              if (err) throw err;
              //console.log("BugPatch插入成功");
              db.close();
          });
      });
}
//saveBugpatch(1,"CNNVD-202011-608");


let buglist=[]
let bugdetail=[]
let bugpatch=[]

function getBugPatch(url,name,bugid) {
    const x=new Promise(( resolve, reject )=> {
        request({
            url:    url,   // 请求的URL
            method: 'GET',                   // 请求方法
            headers: {                       // 指定请求头
            'Accept-Language': 'zh-CN,zh;q=0.8',         // 指定 Accept-Language
            "X-Forwarded-For" : "10.111.198.90"
            }
        }, function(error, response, body) {
            if(!error&&response.statusCode == 200) {
                let thepatch={};
                var $ = cheerio.load(body);
                var patch =$(".detail_xq ul li")
                var len=patch.length;
                thepatch.url=url;
                thepatch.name=name;
                for(var i=0;i<len;i++) {
                    thepatch.patchnumber=patch[0].children[0].next.data.replace(/[\r\n\t]/g,"");
                    thepatch.size=patch[1].children[0].next.data.replace(/[\r\n\t]/g,"");
                    if(patch[2].children[0].next==null){
                        thepatch.level="暂无"
                    }
                    else{
                        thepatch.level=patch[2].children[0].next.data.replace(/[\r\n\t]/g,"");
                    }
                    
                    thepatch.posttime=patch[3].children[0].next.data.replace(/[\r\n\t]/g,"");
                    thepatch.company=patch[4].children[0].next.data.replace(/[\r\n\t]/g,"");
                    thepatch.companyurl=patch[5].children[0].next.attribs.href.replace(/[\r\n\t]/g,"");
                    thepatch.md5=patch[6].children[0].next.data.replace(/[\r\n\t]/g,"");
                }
                //console.log(thepatch);
                saveBugpatch(thepatch,bugid);
                resolve(thepatch);
            }
        })
    }).catch((error) => { console.log(error); })
    return x
    
}
//getBugPatch('http://www.cnnvd.org.cn/web/xxk/bdxqById.tag?id=132391','aa')


function getBugDetail(url,callback) {
    return new Promise(( resolve, reject )=> {
        request({
            url:    url,   // 请求的URL
            method: 'GET',                   // 请求方法
            headers: {                       // 指定请求头
            'Accept-Language': 'zh-CN,zh;q=0.8',         // 指定 Accept-Language
            "X-Forwarded-For" : "10.111.198.90"
            }
        }, function(error, response, body) {
            if(!error&&response.statusCode == 200) {
                let thebug={};
                var $ = cheerio.load(body);
                //console.log(cnnvd.children.toString());
                if(body.match('CNNVD编号')!=null){
                    thebug.cnnvd=body.substr(body.match('CNNVD编号').index+8,17);
                }
                else{
                    thebug.cnnvd=""
                }
                var oo=thebug.cnnvd.indexOf('<');
                if(oo!=-1){
                    thebug.cnnvd=thebug.cnnvd.slice(0,oo);
                }
                var ans=$(".detail_xq ul li a");
                thebug.url=url;
                thebug.level=ans[0].children[0].data.replace(/[\r\n\t]/g,"");
                thebug.cve=ans[1].children[0].data.replace(/[\r\n\t]/g,"");
                thebug.BugType=ans[2].children[0].data.replace(/[\r\n\t]/g,"");
                thebug.posttime=ans[3].children[0].data.replace(/[\r\n\t]/g,"");
                thebug.manace=ans[4].children[0].data.replace(/[\r\n\t]/g,"");
                thebug.update=ans[5].children[0].data.replace(/[\r\n\t]/g,"");
                if(ans[6]!=null){
                    thebug.company=ans[6].children[0].data.replace(/[\r\n\t]/g,"");
                }
                if(ans[7]!=null){
                    thebug.origin=ans[7].children[0].data.replace(/[\r\n\t]/g,"");
                }
        
                var longmessage = $(".d_ldjj")
                var op = cheerio.load(longmessage[0]);
                thebug.introduction=op("p")[0].children[0].data.replace(/[\r\n\t]/g,"")+'\n';
                if(op("p")[1]!=null){
                    thebug.introduction+=op("p")[1].children[0].data.replace(/[\r\n\t]/g,"");
                }
                op = cheerio.load(longmessage[1]);
                var message="";
                var tt=op("p");
                var tt_len=tt.length;
                for(var k=0;k<tt_len;k++) {
                    message=message+tt[k].children[0].data.replace(/[\r\n\t]/g,"")+'\n'
                }
                thebug.bulletin=message;

                op = cheerio.load(longmessage[2]);
                message="";
                tt=op("p");
                tt_len=tt.length;
                for(var k=0;k<tt_len;k++) {
                    message=message+tt[k].children[0].data.replace(/[\r\n\t]/g,"")+'\n'
                }
                thebug.reference=message;

                op = cheerio.load(longmessage[3]);
                message="";
                tt=op("#ent li a");
                tt_len=tt.length;
                for(var k=0;k<tt_len;k++) {
                    message=message+tt[k].children[0].data.replace(/[\r\n\t]/g,"")+'\n'
                    message=message+tt[k].attribs.href+'\n';
                }
                if(message==""){
                    message="暂无";
                }
                thebug.entity=message;

                op = cheerio.load(longmessage[4]);
                message="";
                tt=op("#pat li a");
                tt_len=tt.length;
                bugpatch=[];
                thebug.patch=[];
                for(var k=0;k<tt_len;k++) {
                    message=message+tt[k].children[0].data.replace(/[\r\n\t]/g,"")+'\n'
                    message=message+'http://www.cnnvd.org.cn'+tt[k].attribs.href.substr(1)+'\n';

                    callback('http://www.cnnvd.org.cn'+tt[k].attribs.href.substr(1),tt[k].children[0].data.replace(/[\r\n\t]/g,""),thebug.cnnvd).then(function(result){
                        //console.log(result);
                        bugpatch.push(result);
                        thebug.patch=bugpatch;
                        
                    })
                }
                
                if(message==""){
                    thebug.patch="暂无";
                }
                //console.log(thebug);
                
                resolve(thebug);
            }
        })
    })
}

function getBugUrl(url) {
    const promise = new Promise(( resolve, reject )=> {
        request({
            url:    url,   // 请求的URL
            method: 'GET',                   // 请求方法
            headers: {                       // 指定请求头
            'Accept-Language': 'zh-CN,zh;q=0.8',         // 指定 Accept-Language
            "X-Forwarded-For" : "10.111.198.90"
            }
        }, function(error, response, body) {
            if(!error&&response.statusCode == 200) {
                var $ = cheerio.load(body);
                var list=$(".list_list ul li a");
                var len=list.length;
                for(var i=0;i<len;i+=2){
                    buglist.push('http://www.cnnvd.org.cn/'+list[i].attribs.href);
                    getBugDetail('http://www.cnnvd.org.cn/'+list[i].attribs.href,getBugPatch).then(function(result) {
                        bugdetail.push(result);
                        saveBuglist(result)
                        //console.log(result);
                    });
                }
                //console.log(buglist);
                resolve(buglist);
            }
        })
    })
    return promise;
}

async function readAllBug(){
    try {
        let i=1;
        for(;i<15333;i++) {
            const Data = await getBugUrl('http://www.cnnvd.org.cn/web/vulnerability/querylist.tag?pageno='+i+'&repairLd=');
            //console.log(buglist);
            var StartTime =new Date().getTime(); 
            while (new Date().getTime() <StartTime+5000);
            console.log("page:============>    "+ i);
        }
    } catch (err) {
        console.log(err);
    }
}
readAllBug();


