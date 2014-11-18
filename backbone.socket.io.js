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
            var self = this;
            data || (data = {});
            options || (options = {});
            options.data || (options.data ={});
            options.timeout || (options.timeout = 10000);
            options.success || (options.success = function () {});
            options.timeoutFail || (options.timeoutFail = function() {
                // console.log(typeof self);
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
                if (options.socket_id) this.id = options.socket_id;

                Backbone.Model.apply(this, arguments);
            },
            //
            request: function (method, options) {
                socketRequest.call(this, this.socket, method, {
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
                socketRequest.call(this, this.socket, 'watch', {
                    id: this.id
                },{
                    success: function(data) {
                        self.socket.on("change",
                            function (data) {
                                //console.log("Watch Model Change", data);
                                self.set(data);
                            }
                        );
                        self.socket.on("reset",
                            function (data) {
                                //console.log("Watch Model Reset", data);
                                self.clear();
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
                if (options.socket_id) this.id = options.socket_id;

                Backbone.Collection.apply(this, arguments);
            },
            watch: function (options) {
                // console.log("Watch Collection", this, options);
                var self = this;

                // Join on inintialize. This can probably be moved elsewhere.
                socketRequest.call(this, this.socket, 'watch', {
                    id: this.id
                },{
                    success: function(data) {
                        self.socket.on("change",
                            function (data) {
                                // console.log("Watch Change Collection", data);
                                self.set(data); // Requires the engine to
                                                // set an id.
                            }
                        );
                        self.socket.on("reset",
                            function (data) {
                                // console.log("Watch Reset Collection", data);
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