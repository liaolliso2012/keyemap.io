var myMap = {
    _mapObj: null, // 地图实例
    _drivingObj: null, //驾车实例
    _geo: null,
    _currentRoute: null, // 当前路线
    _startIcon: '',
    _endIcon: '',
    _locIcon: '',
    _startPointM: '', // start point marker
    _endPointM: '', // end point marker
    _containerId: '',
    _centerLat: '',
    _centerLng: '',
    _zoomLevel: 7,
    routePoints: [], // the index of this array should be [0,1,2,3,...,n]
    routePointsWI: [], // the index of this array should be [start, 1, 2, 3, ... , n, end]


    _c: 0, // use to store the click count of addWayPoint icon

    _noteboxid: 0, // use to store the index of note box
    notePoints: [], // use to store anyway point with note box
    noteBoxes: [], // use to store the notebox windows according to _noteboxid
    noteBoxMarkers: [], // use to store the markers of the note box, index is _noteboxid

    onwayBoxes: [], // use to store the onway box windows
    onwayBoxMarkers: [], // use to store the onway markers of the note box


    initMap: function(containerId, centerLat, centerLng, zoomLevel) {
        var map = new BMap.Map(containerId);
        this._centerLat = centerLat;
        this._centerLng = centerLng;
        this._zoomLevel = zoomLevel;
        map.centerAndZoom(new BMap.Point(centerLat, centerLng), zoomLevel);
        map.addControl(new BMap.NavigationControl());               // 添加平移缩放控件
        map.addControl(new BMap.ScaleControl());                    // 添加比例尺控件
        map.addControl(new BMap.OverviewMapControl());              //添加缩略地图控件
        map.enableScrollWheelZoom();
        this._mapObj = map;
        this._drivingObj = new BMap.DrivingRoute(map);
        this._geo = new BMap.Geocoder();

        // add menu
        var menu = new BMap.ContextMenu();
        var txtMenuItem = [
            {
                text: '以此为起点',
                callback: function(e) {
                    myMap.start(e);
                    myMap._geo.getLocation(e, function(rs) {
                        if (rs.address) {
                            $('#start').val(rs.address);
                            e.title = rs.address;
                            myMap.updateRoute('start', e);
                            myMap.generateRoute();
                        }
                    });
                }
            },
            {
                text: '以此为途经点',
                callback: function(e) {
                    if (Object.size(myMap.routePointsWI) < 2) {
                        showMsg('请先确定起点和终点！', $('#start'));
                        return false;
                    }
                    // get address 
                    myMap._geo.getLocation(e, function(rs) {
                        if (rs.address) {
                            e.title = rs.address;
                            var idx = myMap.getNewIndex(e);
                            myMap.routePointsWI.splice(idx, 0, e);
                            myMap.routePoints.splice(idx, 0, e);
                            myMap.updateWaypoints(e);
                            myMap.generateRoute();
                        }
                    });
                }
            },
            {
                text: '以此为终点',
                callback: function(e) {
                    myMap.end(e);
                    myMap._geo.getLocation(e, function(rs) {
                        if (rs.address) {
                            $('#end').val(rs.address);
                            e.title = rs.address;
                            myMap.updateRoute('end', e);
                            myMap.generateRoute();
                        }
                    });
                }
            },
            {
                text: '为此点添加备注',
                callback: function(e) {
                    //console.log(e);
                    //e.boxid = e.lat + e.lng;
                    e.boxid = myMap._noteboxid;
                    myMap._noteboxid++;
                    myMap.notePoints[e.boxid] = e;
                    addNoteMarker('', e, 'open');
                }
            }

        ];
        for (var i = 0; i < txtMenuItem.length; i++) {
            menu.addItem(new BMap.MenuItem(txtMenuItem[i].text, txtMenuItem[i].callback, 100));
        }
        map.addContextMenu(menu);
    },
    initDom: function() {

    },
    hasPoint: function(points, e) {
        //console.log(points);
        for (i in points) {
            if(typeof points[i] === 'undefined')
                continue;
            if (points[i].lat == e.lat && points[i].lng == e.lng) {
                return i;
                break;
            }
        }
        return '';
    },
    getNewIndex: function(point) {
        var dif = [];
        var max = 0;
        var plen = Object.size(myMap.routePointsWI);
        if(plen < 2)
            return false;
        for (i in myMap.routePointsWI) {
            //console.log(i);
            //console.log(typeof i);
            if ($.isNumeric(i) && typeof myMap.routePointsWI[i] !== 'undefined') {
                i = parseInt(i);
                if (i > max)
                    max = i;
                myMap.routePoints[i + 1] = myMap.routePointsWI[i];
            }
        }
        if (typeof myMap.routePointsWI['start'] != 'undefined')
            myMap.routePoints[0] = myMap.routePointsWI['start'];
        if (typeof myMap.routePointsWI['end'] != 'undefined')
            myMap.routePoints[max + 2] = typeof myMap.routePointsWI['end'];
        for (i in myMap.routePoints) {
            var tmp = {};
            tmp.seq = i;
            //tmp.diff = getDistance(point, routePoints[i]);
            tmp.diff = myMap._mapObj.getDistance(point, myMap.routePoints[i]);
            dif.push(tmp);
        }
        dif.sort(compare);
        var nearestSeq = parseInt(dif[0].seq);
        if (nearestSeq == 0) {
            return 1;
        }
        var distance1 = myMap._mapObj.getDistance(point, myMap.routePoints[nearestSeq - 1]);
        var distance2 = myMap._mapObj.getDistance(myMap.routePoints[nearestSeq], myMap.routePoints[nearestSeq - 1]);
        if (distance1 > distance2)
            return nearestSeq + 1;
        else
            return nearestSeq;
    },
    updateRoute: function(cid, thePoint) {
        //console.log('update routePoints');
        this.routePointsWI[cid] = thePoint;
    },
    updateWaypoints: function(e) {
        $('#addWaypoint').click();
        var inputs = $('input[id^=onway]');
        for(i=0;i<inputs.length;i++) {
            var idx = $(inputs[i]).attr('id').substr(5);
            $('#onway'+idx).val(myMap.routePointsWI[idx].title);
        }
        //$('#onway'+idx).val(myMap.routePoints[idx].title);

    },
    updateRouteByAddress: function(elm) {
        if (!elm)
            return false;
        var cid = elm.attr('id');
        if (cid != 'start' && cid != 'end') {
            cid = cid.substr(5);
        }
        var myValue = elm.val();
        myMap._geo.getPoint(myValue, function(point) {
            if (point) {
                //map.centerAndZoom(point, 16);
                point.title = myValue;
                myMap._mapObj.addOverlay(new BMap.Marker(point));
                elm.parent().removeClass('has-error');
                myMap.updateRoute(cid, point);
            } else {
                showMsg('无法找到该地点经纬度，请使用其它地点！', elm);
                return false;
            }
        }, myValue);
    },
    clearMap: function() {
        myMap._drivingObj.clearResults();
        myMap._mapObj.clearOverlays();
    },
    generateRoute: function() {
        //console.log('generate route');
        // update routePoints based on routePointsWI
        var start = myMap.routePointsWI['start'];
        var end = myMap.routePointsWI['end'];
        var max = 0;
        myMap.routePoints = [];
        for (i in myMap.routePointsWI) {
            //console.log(i);
            //console.log(typeof i);
            if ($.isNumeric(i) && typeof myMap.routePointsWI[i] !== 'undefined') {
                i = parseInt(i);
                if (i > max)
                    max = i;
                myMap.routePoints[i + 1] = myMap.routePointsWI[i];
            }
        }
        if (start)
            myMap.routePoints[0] = start;
        if (end)
            myMap.routePoints[max + 2] = end;
        // get rid of undefined
        myMap.routePoints = jQuery.grep(myMap.routePoints, function(value) {
            return typeof value != 'undefined';
        });

        myMap.clearMap();

        var c = parseInt(myMap.routePoints.length);
        if (c < 2) {
            return false;
        }

        myMap.routePoints.sort(function(a, b) {
            return parseInt(a) > parseInt(b) ? 1 : -1
        });
        //console.log(myMap.routePointsWI);
        //console.log(myMap.routePoints);
        //console.log('begin search');

        for (i in myMap.routePoints) {
            i = parseInt(i);
            //console.log(i);
            if (i < c - 1) {
                if (typeof myMap.routePoints[i] === 'undefined')
                    continue;
                var myLabel;
                var boxpostfix = '';
                if (i == 0) {
                    myLabel = '起点';
                    boxpostfix = 'start';
                } else {
                    myLabel = '途经点';
                    boxpostfix = i-1;
                }
                myMap._drivingObj.search(myMap.routePoints[i], myMap.routePoints[i + 1]);
                addMarker(myLabel, myMap.routePoints[i], boxpostfix);
            }
        }
        //console.log('end search');
        // add last point marker
        addMarker('终点', myMap.routePointsWI['end'], 'end');
        // set search callback
        myMap._drivingObj.setSearchCompleteCallback(function() {
            var pts = myMap._drivingObj.getResults().getPlan(0).getRoute(0).getPath();    //通过驾车实例，获得一系列点的数组
            var polyline = new BMap.Polyline(pts);
            myMap._mapObj.addOverlay(polyline);

        });
        myMap.drawAnywayPoints();
        myMap._mapObj.setViewport(myMap.routePoints);
        //console.log(myMap.routePointsWI);
        //console.log(myMap.routePoints);
        return;
    },
    //自定义起点标注
    start: function(e) {
        myMap._startPointM = new BMap.Marker(e, {
            icon: myMap._startIcon
        });
    },
    //自定义终点标注
    end: function(e) {
        myMap._endPointM = new BMap.Marker(e, {
            icon: myMap._endIcon
        });
    },
    drawAnywayPoints: function() {
        if (Object.size(myMap.notePoints) > 0) {
            for (i in myMap.notePoints) {
                addNoteMarker('', myMap.notePoints[i]);
            }
        }
    }

};



Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key))
            size++;
    }
    return size;
};

var compare = function(a, b) {
    if (a.diff < b.diff)
        return -1;
    if (a.diff > b.diff)
        return 1;
    return 0;
};

var showMsg = function(msg, elm, msgType) {
    if (typeof msgType === 'undefined')
        msgType = 'error';
    var cls = 'alert alert-danger';
    switch (msgType) {
        case 'success':
            cls = 'alert alert-success';
            break;
        case 'info':
            cls = 'alert alert-info';
            break;
        default:
    }
    elm.addClass('has-error');
    $('#message').html(msg);
    $('#message').attr('class', cls);
    $('#message').css('visibility', 'visible');
    $('#message').animate({'opacity': 0}, 1000).animate({'opacity': 1}, 1000);
};

// 添加路线
function addRoute(path) {
    myMap._mapObj.addOverlay(new BMap.Polyline(path, {
        strokeColor: '#333',
        enableClicking: false
    }));
}

function bindAddWaypoint() {
    $('#addWaypoint').tooltip();
    $("#addWaypoint").on('click', $('.end'), function() {
        var p = $(this).parent().prev();
        if (p.hasClass('start')) {
            var input = '';
            input += '<div class="col-xs-2 onway">';
            input += '<input type="text" id="onway0" name="onway0" class="address form-control" placeholder="途经点" />';
            input += '<span class="input-icon fui-cross delwp" data-toggle="tooltip" data-placement="top" data-original-title="点击删除此途经点"></span>'
            input += '<span class="input-icon fui-eye" id="showOnwayList" data-toggle="tooltip" data-placement="top" data-original-title="点击收缩途经点列表"></span>'
            input += '</div>';
            $(input).insertBefore($(this).parent());
            $('#showOnwayList').tooltip();
            $('.fui-cross').tooltip();
            autoCompleteIt('onway0');
            bindDelwp($('#onway0').parent());
        } else {
            if (p.children().length == 3) {
                var list = '<div id="waypointList">';
                list += '<ul></ul>';
                list += '</div>';
                $(list).appendTo(p);
                $('.fui-eye').click(function() {
                    $('#waypointList').slideToggle();
                });
            }
            var input = '<li id="li' + myMap._c + '"><div class="form-group"><input type="text" name="onway' + myMap._c + '" id="onway' + myMap._c + '" placeholder="途经点' + myMap._c + '" class="address form-control"/>';
            input += '<span class="input-icon fui-cross delwp"></span></div></li>';
            $(input).appendTo($('#waypointList ul'));
            autoCompleteIt('onway' + myMap._c);
            $('#waypointList').slideDown();
            bindDelwp($('#li' + myMap._c));
        }
        myMap._c++;
        //$('#showOnwayList').parent().dropdown('toggle');
    });

}

function bindDelwp(p) {
    $('.delwp', p).click(function() {
        //console.log('del it');
        //console.log(Object.size(myMap.routePointsWI));
        //console.log(myMap.routePoints);
        var theId = $(this).prev().attr('id');
        if (theId) {
            var seq = parseInt(theId.substr(5));
            if (seq == 0) {
                var firstEle = $('#waypointList ul li:first-child');
                //console.log(firstEle.attr('id'));
                if (typeof firstEle.attr('id') != 'undefined') {
                    // we update onway0 to onway1
                    var nextVal = $('input', firstEle).val();
                    var nextId = $('input', firstEle).attr('id').substr(5);
                    myMap.updateRoute(seq.toString(), myMap.routePointsWI[nextId]);
                    delete myMap.routePointsWI[nextId];
                    $('#onway0').val(nextVal);
                    firstEle.remove();
                } else {
                    delete myMap.routePointsWI[0];
                    p.remove();
                }
            } else {
                myMap.updateRoute(seq, undefined);
                $(this).parent().parent().remove();
            }
        }
        //console.log(myMap.routePointsWI);
        //console.log(myMap.routePoints);
        //console.log('del finished');
    });
}
function bindSearchMap() {
    var that = myMap;
    $("#searchMap").click(function() {
        // clear the route first
        that._mapObj.clearOverlays();
        // check if the point is in the routePoints
        that.updateRouteByAddress($('#start'));
        $.each($('input[id^=onway]'), function(k, v) {
            var theId = $(v).attr('id').substr(5);
            if (typeof that.routePointsWI[theId] == 'undefined')
                that.updateRouteByAddress($(v));
        });
        that.updateRouteByAddress($('#end'));
        //console.log(that.routePointsWI);
        setTimeout(that.generateRoute, 1000);

    });
}
function bindPolicySearch() {
    $('.policyBtn').click(function() {
        var thePolicy = $(this).attr('data-po');
        //console.log('Change policy to ' + thePolicy);
        switch (thePolicy) {
            case 'leastTime':
                myMap._drivingObj.setPolicy(BMAP_DRIVING_POLICY_LEAST_TIME);
                break;
            case 'shortestPath':
                myMap._drivingObj.setPolicy(BMAP_DRIVING_POLICY_LEAST_DISTANCE);
                break;
            case 'noHighway':
                myMap._drivingObj.setPolicy(BMAP_DRIVING_POLICY_AVOID_HIGHWAYS);
                break;
        }
//myMap._drivingObj.setPolicy(policyIndex);
        myMap.generateRoute();
    });
}

function autoCompleteIt(eid) {
    var elm = $('#' + eid);
    var cid = eid;
    if (cid != 'start' && cid != 'end') {
        cid = cid.substr(5);
    }

    if (typeof elm.attr('id') != 'undefined') {
        var ac = new BMap.Autocomplete({
            input: eid,
            location: myMap._mapObj
        });
        ac.addEventListener("onconfirm", function(e) {
            var _value = e.item.value;
            var myValue = _value.province + _value.city + _value.district + _value.street + _value.business;
            // add marker
            myMap._geo.getPoint(myValue, function(point) {
                if (point) {
                    ///console.log(point);
                    //map.centerAndZoom(point, 16);
                    point.title = myValue;
                    var tmpMarker = new BMap.Marker(point);
                    myMap._mapObj.addOverlay(tmpMarker);
                    elm.parent().removeClass('has-error');
                    // 更新路线数据
                    //console.log(cid);
                    myMap.updateRoute(cid, point);
                    addMarker('', point, cid)

                } else {
                    showMsg('无法找到该地点经纬度，请使用其它地点！', elm);
                    return false;
                }
            }, _value.city);
        });
    }
}

function getWindowContent(cid, ct) {
    if (typeof ct == 'undefined')
        ct = '';
    var content = '<div class="notebox" id="onwaynotebox' + cid + '"><div class="title">添加备注</div><textarea id="textarea' + cid + '" cols="20" rows="3">' + ct + '</textarea>';
    content += '<input type="button" id="addnote' + cid + '" value="确定" class="btn btn-block btn-sm btn-primary"/></div>';

    return content;
}

function getNoteForm(noteboxid, ct) {
    if (typeof ct == 'undefined')
        ct = '';
    var content = '<div class="notebox" id="notebox' + noteboxid + '"><div class="title">添加备注</div><textarea id="anypoint_note' + noteboxid + '" cols="20" rows="3">' + ct + '</textarea>';
    content += '<input type="button" id="anypoint_btn' + noteboxid + '" value="确定" class="btn btn-block btn-sm btn-primary"/></div>';
    return content;
}

function bindSaveNote(cid) {
    $('#addnote' + cid + '').click(function() {
        console.log('Send data:' + $('#textarea' + cid).val() + ' to backend');
        /*******************发送数据到后台保存*********************/

        /*******************发送数据到后台保存*********************/
        myMap.onwayBoxMarkers[cid + ''].content = $('#textarea' + cid).val();
        myMap.onwayBoxMarkers[cid + ''].closeInfoWindow(myMap.onwayBoxes[cid + '']);
        return;
    });
}

function bindAddNote(boxid) {
    //console.log('bind add btn' + boxid);
    $('#anypoint_btn' + boxid).click(function() {
        console.log($('#anypoint_note' + boxid).val());
        /*******************发送数据到后台保存*********************/

        /*******************发送数据到后台保存*********************/
        myMap.notePoints[boxid].content = $('#anypoint_note' + boxid).val();
        myMap.noteBoxMarkers[boxid].closeInfoWindow(myMap.noteBoxes[boxid]);
        return;
    });
}

function bindClearMap() {
    $('#clearMap').click(function() {
        myMap.clearMap();
        myMap.routePoints = [];
        myMap.routePointsWI = [];
    });
}

function addMarker(label, point, cid) {
//    var tmpMarker = myMap.onwayBoxMarkers[cid];
//    if (typeof tmpMarker === 'undefined') {
//        tmpMarker = new BMap.Marker(point);
//        myMap._mapObj.addOverlay(tmpMarker);
//    } else
//        myMap._mapObj.addOverlay(myMap.onwayBoxMarkers[cid]);
    var tmpMarker = new BMap.Marker(point);
    myMap._mapObj.addOverlay(tmpMarker);
    if (label != '') {
        var tmpLabel = new BMap.Label(label, {position: point});
        myMap._mapObj.addOverlay(tmpLabel);
    }
    // when click on marker, we show infowindow
    var content = getWindowContent(cid);
    var infoWin = new BMap.InfoWindow(content);
    myMap.onwayBoxes[cid] = infoWin;
    // when click on marker, we show infowindow
    tmpMarker.addEventListener("click", function() {
        var mhas = myMap.hasPoint(myMap.routePointsWI, point);
        var theCt = '';
//        console.log('whether has this point in routePointsWI');
//        console.log(mhas);
//        console.log(myMap.routePointsWI);
        if (mhas !== '' && typeof myMap.onwayBoxMarkers[mhas].content != 'undefined') {
            theCt = myMap.onwayBoxMarkers[mhas].content;
        }
        var content = getWindowContent(cid, theCt);
        var theInfoWin = new BMap.InfoWindow(content);
        tmpMarker.openInfoWindow(theInfoWin);
        bindSaveNote(cid);
    });
    infoWin.redraw();
    bindSaveNote(cid);
    myMap.onwayBoxMarkers[cid] = tmpMarker;
}

function addNoteMarker(label, e, status) {
    if (typeof status == 'undefined')
        status = 'closed';
    var content = getNoteForm(e.boxid);
    var infoWin = new BMap.InfoWindow(content);
    myMap.noteBoxes[e.boxid] = infoWin;
    var tmpMarker = new BMap.Marker(e);
    myMap._mapObj.addOverlay(tmpMarker);
    if (label != '') {
        var tmpLabel = new BMap.Label(label, {position: e});
        myMap._mapObj.addOverlay(tmpLabel);
    }
    if (status == 'open') {
        tmpMarker.openInfoWindow(infoWin);
        infoWin.redraw();
        setTimeout(bindAddNote, 500, e.boxid); // 防止第一次不能绑定上事件，延迟绑定
    }
    tmpMarker.addEventListener("click", function() {
        var point = this.getPosition();
        var mhas = myMap.hasPoint(myMap.notePoints, point);
        var theCt = '';
        //console.log(mhas !== '');
        //console.log(myMap.notePoints);
        if (mhas !== '') {
            theCt = myMap.notePoints[mhas].content;
        }
        var content = getNoteForm(e.boxid, theCt);
        var theInfoWin = new BMap.InfoWindow(content);
        tmpMarker.openInfoWindow(theInfoWin);
        theInfoWin.redraw();
        bindAddNote(e.boxid);
    });
    myMap.noteBoxMarkers[e.boxid] = tmpMarker;
    return true;

}