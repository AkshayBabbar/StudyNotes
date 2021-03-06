var _ = require('underscore')
var async = require('async')
var auth = require('../lib/auth')
var bcrpyt = require('bcrypt')
var email = require('../lib/email')
var model = require('../model')
var ssl = require('../lib/ssl')

module.exports = function (app) {
  // Page 1

  app.get('/signup', ssl.ensureSSL, auth.returnTo, function (req, res) {
    if (req.user) {
      res.redirect('/')
    } else {
      res.render('signup', {
        title: 'Sign Up',
        url: '/signup',
        errors: req.flash('error'),
        user: req.flash('user')[0]
      })
    }
  })

  app.post('/signup', ssl.ensureSSL, function (req, res, next) {
    var user = new model.User({
      name: req.body.name,
      email: req.body.email || (req.session.pro && req.session.pro.email),
      password: req.body.password
    })
    user.save(function (err) {
      if (err && err.code === 11000) {
        req.flash('error', 'A user is already using that email address.')
        req.flash('user', req.body)
        res.redirect('/signup/')
      } else if (err && err.name === 'ValidationError') {
        _(err.errors).each(function (error) {
          req.flash('error', error.message)
        })
        req.flash('user', req.body)
        res.redirect('/signup/')
      } else if (err) {
        next(err)
      } else {
        // Automatically login the user
        req.login(user, function (err) {
          if (err) return next(err)
          if (req.session.pro && req.session && req.session.returnTo) {
            var url = req.session.returnTo
            delete req.session.returnTo
            res.redirect(url)
          } else {
            res.redirect('/signup2/')
          }
        })
      }
    })
  })

  // Page 2

  app.get('/signup2', ssl.ensureSSL, auth.returnTo, function (req, res) {
    if (!req.user) return res.redirect('/signup/')
    res.render('signup2', {
      errors: req.flash('error'),
      user: req.flash('user')[0]
    })
  })

  app.post('/signup2', ssl.ensureSSL, function (req, res, next) {
    var user = req.user
    if (!user) return next(new Error('No logged in user'))

    var college = model.cache.colleges[req.body.college]
    if (college && college.id === 'common-app')
      college = null

    user.college = college && college.id
    user.collegeMajor = req.body.collegeMajor || undefined
    user.collegeYear = req.body.collegeYear || undefined

    user.save(function (err) {
      if (err && err.name === 'ValidationError') {
        _(err.errors).each(function (error) {
          req.flash('error', error.message)
        })
        req.flash('user', req.body)
        res.redirect('/signup2/')
      } else if (err) {
        next(err)
      } else {
        if (req.session && req.session.returnTo) {
          var url = req.session.returnTo
          delete req.session.returnTo
          res.redirect(url)
        } else {
          res.redirect('/submit/essay/')
        }
        // email.notifyAdmin('New user', user)
      }
    })
  })
}

// TODO: add users to Mailchimp
// module.exports = function () {
//   app.post('/subscribe', function (req, res) {
//     try {
//       var api = new MailChimpAPI(secret.mailchimp.key, { version : '2.0' })
//     } catch (e) {
//       console.error(e)
//     }

//     var email = req.body.email

//     api.call('lists', 'subscribe', {
//       email: { email: email },
//       id: secret.mailchimp.listId
//     }, function (err, data) {
//       if (err) {
//         console.error(err)
//         res.send({ status: 'error' })
//       } else {
//         res.send({ status: 'ok' })
//       }
//     })
//   })
// }
