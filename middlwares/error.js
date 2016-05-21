'use strict';

exports = module.exports = (app) => {
	
/// catch 404 and forward to error handler
app.use((req, res, next) => {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace

let mode = app.get('env') || '';
if (mode.indexOf('devel') > -1) {
    app.use((err, req, res, next) => {
        res.status(err.status || 500).json(
        {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {},
        title: 'error'
    });
});

}
