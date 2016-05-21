'use strict';

let log = console.log
  , async = require('async')
  , path = require('path')
  , exec = require('child_process').exec
  , spawn = require('child_process').spawn
  ;

const APPS_DIR = '/tmp/';
const PKG_CACHE = path.join(__dirname + '/../apibase/cache_pkg');
const API_BASE = path.join(__dirname + '/../apibase/sails');
const PM2 = path.join(__dirname + '/../tools/apps.sh');



const SAILS = {
    CMD: 'sails',
    MODEL: (p) => `generate fullmodel ${p}`,
    CONTROLLER: (p) => `generate controller ${p}`
}


module.exports = (router) => {
  router.get('/', (req, res) => {
    res.send('respond with a resource');
  });

  /*
   * Stop or Start pm2 sails app
   *
   */
  router.post(/(stop|start|run)/, validate('app_name','usr_id'), (req, res) => {
      let action = path.basename(req.originalUrl);
      let app = req.body.app_name;
      let usr_id = req.body.usr_id;
      let app_id=`${app}:${usr_id}`;

      pm2Call(`-${action}`, app_id).then(o => res.json(o))
      .catch(err => {
        log(`Error on ${action} app `, err.toString());
        res.status(500).json({ err: 'INTERNAL_ERROR' });
      });
  });


  /*
   * Remove sails app
   */
  router.delete('/:id', (req, res) => {
      removeApp(req.params.id).then(o => res.json({ res: o}));
  });


  /*
   * Create or publish sails app
   *
   */
  router.post('/', validate('app_name', 'usr_id'), (req, res, next) => {
      let app = req.body.app_name;
      let usr_id = req.body.usr_id;
      let app_id = `${app}:${usr_id}`;

      //if exist remove
      //if running stoped
      removeApp(app_id)
      .then(o => pm2Call('-remove', app_id), e => log(e))
      .then(o => createProject(app_id))
      //.then(o => installPkgs(app_id))
      .then(o => getModels(req.db))
      .then(o => createModels(app_id, o))
      .then(o => createControllers(app_id, o))
      //.then(o => addNginxConf(app_id))
      .then(o => pm2Call('-run', app_id))
      .then(o => {
          req.db.close();
          res.json({ port: o });
      })
      .catch(err => {
        log('Error on create app ', err.toString());
        next('INTERNAL_ERROR')
      });

  });


  router.post('/api/model', validate('model'), (req, res) => {
      let model = req.body.model;
      //req.db.collection('model')

  });

  /*
   *
   * Generic body request validation
   *
   * @param {arguments} fields multiple body fields
   * @return error or next express function
   *
   */
  function validate(fields){
      return (req, res, next) => {
          let i = 0;
          let p = null;

          while(arguments[i]){
              p = arguments[i];
              if (!req.body[p] && !req.params[p]){
                  next(`PARAM_${p.toUpperCase()}_IS_REQUIRED`)
                  break;
              }
              i++;
          }
          next();
      }
  }


  /*
   * Function create new sails app
   *
   * @param app app name
   * @return Promise Object
   *
   */
  function createProject(app) {
    log('Sails creating api ', app);

    let DEST = APPS_DIR + app;

    return callCMD(`cp -r ${API_BASE} ${DEST}`);
  };


 /*
  * Function install node packages from cached folder
  *
  * @param {String} app the app name
  *
  */
  function installPkgs(app){
    let dest = `${APPS_DIR}${app}/node_modules`;
    log('Install Node_modules', dest);

    return callCMD(`ln -s ${PKG_CACHE} ${dest}`);
  }

  /*
   * Function get all models configured from admin platform
   *
   * @param {Object} db is the mongo connection
   * @return Promise Object
   *
   */
  function getModels(db) {
    return new Promise((res, rej) => {
      log('Searching db models');
      db.collection('model').find({}).toArray((err, data) => {
          if (err) throw err;

          log('Total models %d', data.length);
          res(data);
      });
    });
  }

  /*
   * Function create sails.js models
   *
   * @param {String} app_id the new app
   * @param {Array} models the models db
   * @return Promise Object
   *
   */
  function createModels(app_id, models) {
      return new Promise((res, rej) => {
          async.each(models, (m, cb) => {
              createModel(app_id, m, cb);
          },
          (err) => {
              log(err)
              if (err) throw err;
              res(models);
          });
      });
  }


  function createModel(app_id, m, cb){
      let fdir = APPS_DIR+app_id;

      log('Creating model ', m.dbcollection);

      let args = SAILS.MODEL(m.dbcollection) + ' ';
      args+= m.attrs.map(a =>  {
        if (a.isObject){
          return `${a.jsonfield}:collection:${a.type}`;
        }
        return a.jsonfield+':'+a.type;
      }).join(' ');

      callCMD(`${SAILS.CMD} ${args}`, { cwd: fdir })
      .then(o => cb())
      .catch(cb);
  }

  /*
   * Function create sails.js models
   *
   * @param {String} app_id the new app
   * @param {Array} models the models db
   *
   * @return Promise Object
   *
   */
  function createControllers(app_id, models) {
      return new Promise((res, rej) => {
          async.each(models, (m, cb) => {
              createController(app_id, m, cb);
          },
          (err) => {
              log(err)
              if (err) throw new Error(err);
              res('OK');
          });
      });
  }


  function createController(app_id, m, cb){
      let fdir = APPS_DIR+app_id;

      log('Creating Controller ', fdir, m.dbcollection);
      let ctrl = SAILS.CONTROLLER(m.dbcollection);

      callCMD(`${SAILS.CMD} ${ctrl}`, { cwd: fdir })
      .then(o => cb())
      .catch(cb);
  }




  /*
   * Function call pm2 wrap in bash shell
   *
   * @param {String} action is the action to pm2
   * @param {String} app_id the folder name + usr_id
   *
   * @return {Object} Promise
   */
  function pm2Call(action, app_id){
    if (['-stop','-run','-start','-remove'].indexOf(action) < 0){
      throw new Error('INVALID_PM2_USAGE_ACTION');
    }

    let file = '';
    if (action == '-run'){
      file = APPS_DIR + app_id + '/app.js';
    }

    return callCMD(`${PM2} ${action} ${file} ${app_id}`);
  }



 /*
  * Function remove app
  *
  * @param {String} app the app name
  *
  */
  function removeApp(app){
    let fdir = APPS_DIR + app;
    log('Removing app: ', fdir);

    return callCMD(`rm -r ${fdir}`)
  }


  function callCMD(command, opts){
    opts = opts || {};
    log('EXEC: ', command);

    return new Promise((res, rej) => {
      exec(command, opts, (err, stdout, stderr) => {
        if (opts.debug){
          log(stdout)
        }
        if (stderr || err){
          rej(stderr || err);
        }
        else{
          res(stdout);
        }
      });
    });
  }

  return router;
}
