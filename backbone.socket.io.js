/*  backbone.socket.io.js

    (c) 2010 - 2014 C. Nicholas Long
*/
"use strict";

define(['backbone'],
    function(Backbone) {

        /* Mimics a very simple Request/Response dynamic through a
            socket.
        */
        var socketRequest = function (socket, method, data, options) {
            data || (data = {});
            options || (options = {});
            options.data || (options.data ={});
            options.timeout || (options.timeout = 10000);
            options.success || (options.success = function () {});
            options.timeoutFail || (options.timeoutFail = function() {
                throw "'socketRequest' expected a response ";
            });

            var self = this,
                syncId = _.uniqueId(method),
                timeoutTimer = setTimeout(options.timeoutFail, options.timeout);

            socket.once("response_"+syncId, function(responseData) {
                clearTimeout(timeoutTimer);
                options.success(responseData);
            });

            // Send the command through the socket.
            socket.emit(method, _.extend({
                request_id: syncId,
            }, data, options.data));
        }

        /* Interesting idea to unify Backbone.Model and socketio
        Several implementations already exist in the wild, but seem to
        run in to trouble of trying to do "too much".
        */
        var Model = Backbone.Model.extend({
            //
            constructor: function (attributes, options) {
                options || (options = {});
                if (options.socket) this.socket = options.socket;
                if (options.controller) this.controller = options.controller;
                if (options.model_id) this.id = options.model_id;

                Backbone.Model.apply(this, arguments);
            },
            //
            request: function (method, options) {
                socketRequest(this.socket, method, {
                    //ns: this.url(),
                    id: this.id
                    }, options);
            },
            /* Incomplete sync method.
            */
            /*
            sync: function (method, model, options) {
                var self = this,
                    success;

                if (method == "read") {
                    success = function (data) {
                        self.set(data);
                        if (options.success) {
                            options.success(model, null, options);
                        }
                    }
                }

                socketRequest(this.socket, method, {
                    ns: model.url(),
                    id: this.id,
                    data: this.changed
                    }, {
                    success: success
                });
            },
            */
            // Watch the model and receive a "change" event when updated.
            watch: function (options) {
                var self = this;

                // Join on inintialize. This can probably be moved elsewhere.
                socketRequest(this.socket, 'watch', {
                    id: this.id
                },{
                    success: function(data) {
                        self.socket.on("change",
                            function (data) {
                                // console.log("Watch Change Model", data);
                                self.set(data);
                            }
                        );
                    }
                });
            }
        });

        var Collection = Backbone.Collection.extend({
            //
            constructor: function (attributes, options) {
                options || (options = {});
                if (options.socket) this.socket = options.socket;
                if (options.model_id) this.id = options.model_id;

                Backbone.Collection.apply(this, arguments);
            },
            watch: function (options) {
                // console.log("Watch Collection", this, options);
                var self = this;

                // Join on inintialize. This can probably be moved elsewhere.
                socketRequest(this.socket, 'watch', {
                    id: this.id
                },{
                    success: function(data) {
                        self.socket.on("change",
                            function (data) {
                                // console.log("Watch Change Collection", data);
                                self.reset(data);
                            }
                        );
                    }
                });
            }
        });

        return {
            socketRequest: socketRequest,
            Model: Model,
            Collection: Collection
        };
    }
);