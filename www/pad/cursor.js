define([
    'jquery',
    '/common/common-ui-elements.js',
    '/common/common-interface.js',
    '/bower_components/chainpad/chainpad.dist.js',
], function ($, UIElements, UI, ChainPad) {
    var Cursor = {};

    Cursor.isCursor = function (el) {
        return typeof (el.getAttribute) === "function" &&
                el.getAttribute('class') &&
                /cp-cursor-position/.test(el.getAttribute('class'));
    };

    Cursor.preDiffApply = function (info) {
        if (info.node && info.node.tagName === 'SPAN' &&
            info.node.getAttribute('class') &&
            /cp-cursor-position/.test(info.node.getAttribute('class'))) {
            if (info.diff.action === 'removeElement') {
                console.error('PREVENTING REMOVAL OF CURSOR', info.node);
                return true;
            }
        }
    };

    Cursor.create = function (inner, hjsonToDom, cursorModule) {
        var exp = {};

        var cursors = {};

        var makeTippy = function (cursor) {
            /*var html = '<span class="cp-cursor-avatar">';
            if (cursor.avatar && UIElements.getAvatar(cursor.avatar)) {
                html += UIElements.getAvatar(cursor.avatar);
            }
            html += cursor.name + '</span>';
            return html;*/
            return cursor.name;
        };

        var makeCursor = function (id, cursor) {
            if (cursors[id]) {
                cursors[id].el.remove();
                cursors[id].elstart.remove();
                cursors[id].elend.remove();
            }
            cursors[id] = {
                el: $('<span>', {
                    'id': id,
                    'data-type': '',
                    title: makeTippy(cursor),
                    'class': 'cp-cursor-position'
                })[0],
                elstart: $('<span>', {
                    'id': id,
                    'data-type': 'start',
                    title: makeTippy(cursor),
                    'class': 'cp-cursor-position'
                })[0],
                elend: $('<span>', {
                    'id': id,
                    'data-type': 'end',
                    title: makeTippy(cursor),
                    'class': 'cp-cursor-position'
                })[0],
            };
            return cursors[id];
        };
        var deleteCursor = function (id) {
            if (!cursors[id]) { return; }
            cursors[id].el.remove();
            cursors[id].elstart.remove();
            cursors[id].elend.remove();
            delete cursors[id];
        };


        var addCursorAtRange = function (cursorEl, r, cursor, type) {
            var pos = type || 'start';
            var p = r[pos].el.parentNode;
            var el = cursorEl['el'+type];
            if (cursor.color) {
                 $(el).css('border-color', cursor.color);
                 $(el).css('background-color', cursor.color);
            }
            if (r[pos].offset === 0) {
                if (r[pos].el.nodeType === r[pos].el.TEXT_NODE) {
                    // Text node, insert at the beginning
                    p.insertBefore(el, p.childNodes[0] || null);
                } else {
                    // Other node, insert as first child
                    r[pos].el.insertBefore(el, r[pos].el.childNodes[0] || null);
                }
            } else {
                if (r[pos].el.nodeType !== r[pos].el.TEXT_NODE) { return; }
                // Text node, we have to split...
                var newNode = r[pos].el.splitText(r[pos].offset);
                p.insertBefore(el, newNode);
            }
        };

        exp.removeCursors = function () {
            for (var id in cursors) {
                deleteCursor(id);
            }
        };

        exp.cursorGetter = function (hjson) {
            cursorModule.offsetUpdate();
            var userDocStateDom = hjsonToDom(hjson);
            var ops = ChainPad.Diff.diff(inner.outerHTML, userDocStateDom.outerHTML);
            return cursorModule.getNewOffset(ops);
        };

        exp.onCursorUpdate = function (data, hjson) {
            if (data.leave) {
                if (data.id.length === 32) {
                    Object.keys(cursors).forEach(function (id) {
                        if (id.indexOf(data.id) === 0) { deleteCursor(id); }
                    });
                }
                deleteCursor(data.id);
                return;
            }
            var id = data.id;
            var cursorObj = data.cursor;

            if (!cursorObj.selectionStart) { return; }

            // 1. Transform the cursor to get the offset relative to our doc
            // 2. Turn it into a range
            var userDocStateDom = hjsonToDom(hjson);
            var ops = ChainPad.Diff.diff(userDocStateDom.outerHTML, inner.outerHTML);
            var r = cursorModule.getNewRange({
                start: cursorObj.selectionStart,
                end: cursorObj.selectionEnd
            }, ops);
            var cursorEl = makeCursor(id, cursorObj);
            if (r.start.el === r.end.el && r.start.offset === r.end.offset) {
                // Cursor
                addCursorAtRange(cursorEl, r, cursorObj, '');
            } else {
                // Selection
                addCursorAtRange(cursorEl, r, cursorObj, 'end');
                addCursorAtRange(cursorEl, r, cursorObj, 'start');
            }
            inner.normalize();
        };

        return exp;
    };

    return Cursor;
});
