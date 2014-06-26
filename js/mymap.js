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
    infoWindows: [], // use to store all the info windows

    _c: 0, // use to store the click count of addWayPoint icon

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
                    var idx = myMap.getNewIndex(e);
                    console.log(idx);
                    myMap.routePoints.splice(idx, 0, e);
                    console.log(myMap.routePoints);
                    myMap.generateRoute();
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
            }

        ];
        for (var i = 0; i < txtMenuItem.length; i++) {
            menu.addItem(new BMap.MenuItem(txtMenuItem[i].text, txtMenuItem[i].callback, 100));
        }
        map.addContextMenu(menu);
    },
    initDom: function() {

    },
    getNewIndex: function(point) {
        var dif = [];
        for (i in myMap.routePoints) {
            var tmp = {};
            tmp.seq = i;
            //tmp.diff = getDistance(point, routePoints[i]);
            tmp.diff = myMap._mapObj.getDistance(point, myMap.routePoints[i]);
            dif.push(tmp);
        }
        dif.sort(compare);
        var nearestSeq = parseInt(dif[0].seq);
        if(nearestSeq == 0) {
            return 1;
        }
        var distance1 = myMap._mapObj.getDistance(point, myMap.routePoints[nearestSeq-1]);
        var distance2 = myMap._mapObj.getDistance(myMap.routePoints[nearestSeq], myMap.routePoints[nearestSeq-1]);
        if(distance1 > distance2)
            return nearestSeq+1;
        else
            return nearestSeq;
    },
    updateRoute: function(cid, thePoint) {
        //console.log('update routePoints');
        this.routePointsWI[cid] = thePoint;
        // update routePoints based on routePointsWI
        for (i in this.routePointsWI) {
            if (i == 'start')
                this.routePoints[0] = this.routePointsWI['start'];
            else if (i == 'end')
                this.routePoints[Object.size(this.routePointsWI) - 1] = this.routePointsWI['end'];
            else
                this.routePoints[parseInt(i) + 1] = this.routePointsWI[parseInt(i)];
        }
        //console.log(this.routePoints);
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
                showMsg('无法找到该地点经纬度，请使用其它地点！');
                return false;
            }
        }, myValue);
    },
    clearMap: function() {
        myMap._drivingObj.clearResults();
        myMap._mapObj.clearOverlays();
    },
    generateRoute: function() {
        //console.log(myMap.routePoints);
        myMap.clearMap();
        var c = myMap.routePoints.length;
        if (c < 2) {
            return false;
        }

        myMap.routePoints.sort(function(a, b) {
            return parseInt(a) > parseInt(b) ? 1 : -1
        });
        for (i in myMap.routePoints) {
            i = parseInt(i);
            if (i < c - 1) {
                var myLabel;
                if (i == 0)
                    myLabel = '起点';
                else
                    myLabel = '途经点';
                myMap._drivingObj.search(myMap.routePoints[i], myMap.routePoints[i + 1]);
                var tmpMarker = new BMap.Marker(myMap.routePoints[i]);
                myMap._mapObj.addOverlay(tmpMarker);
                var tmpLabel = new BMap.Label(myLabel, {position: myMap.routePoints[i]});
                myMap._mapObj.addOverlay(tmpLabel);
                // when click on marker, we show infowindow
                var infoWin = null;
                var content = getWindowContent(i);
                infoWin = new BMap.InfoWindow(content);
                tmpMarker.addEventListener("click", function() {
                    var tm = this;
                    tm.openInfoWindow(infoWin);
                    $('#addNote' + i).click(function() {
                        alert($('#textarea' + i).val());
                        tm.closeInfoWindow();
                        return false;
                    });
                });
                myMap.infoWindows[i] = infoWin;
            }
        }
        // add last point marker
        var tmpMarker = new BMap.Marker(myMap.routePoints[i]);
        myMap._mapObj.addOverlay(tmpMarker);
        var tmpLabel = new BMap.Label("终点", {position: myMap.routePoints[i]});
        myMap._mapObj.addOverlay(tmpLabel);
        // when click on marker, we show infowindow
        var infoWin = null;
        var content = getWindowContent(i);
        infoWin = new BMap.InfoWindow(content);
        tmpMarker.addEventListener("click", function() {
            var tm = this;
            tm.openInfoWindow(infoWin);
            $('#addNote' + i).click(function() {
                alert($('#textarea' + i).val());
                tm.closeInfoWindow();
                return false;
            });
        });
        myMap.infoWindows[i] = infoWin;


        // set search callback
        myMap._drivingObj.setSearchCompleteCallback(function() {
            var pts = myMap._drivingObj.getResults().getPlan(0).getRoute(0).getPath();    //通过驾车实例，获得一系列点的数组
            var polyline = new BMap.Polyline(pts);
            myMap._mapObj.addOverlay(polyline);

        });

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
            input += '<span class="input-icon fui-eye" id="showOnwayList" data-toggle="tooltip" data-placement="top" data-original-title="点击收缩途经点列表"></span>'
            input += '</div>';
            $(input).insertBefore($(this).parent());
            $('#showOnwayList').tooltip();
            autoCompleteIt('onway0');
        } else {
            if (p.children().length == 2) {
                var list = '<div id="waypointList">';
                list += '<ul></ul>';
                list += '</div>';
                $(list).appendTo(p);
                $('.fui-eye').click(function() {
                    $('#waypointList').slideToggle();
                });
            }
            var input = '<input type="text" name="onway' + myMap._c + '" id="onway' + myMap._c + '" placeholder="途经点' + myMap._c + '" class="address form-control"/>';
            $(input).appendTo($('#waypointList ul'));
            autoCompleteIt('onway' + myMap._c);
            $('#waypointList').slideDown();
        }
        myMap._c++;
        //$('#showOnwayList').parent().dropdown('toggle');
    });
}
function bindSearchMap() {
    var that = myMap;
    $("#searchMap").click(function() {
        // clear the route first
        that._mapObj.clearOverlays();
        // check if the point is in the routePoints
        if (typeof that.routePointsWI['start'] == 'undefined') {
            that.updateRouteByAddress($('#start'));
        }
        $.each($('input[id^=onway]'), function(k, v) {
            var theId = $(v).attr('id').substr(5);
            if (typeof that.routePointsWI[theId] == 'undefined')
                that.updateRouteByAddress($(v));
        });
        if (typeof that.routePointsWI['end'] == 'undefined') {
            that.updateRouteByAddress($('#end'));
        }
        setTimeout(that.generateRoute, 1000);

    });
}
function bindPolicySearch() {
    $('.policyBtn').click(function() {
        var thePolicy = $(this).attr('data-po');
        console.log('Change policy to ' + thePolicy);
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
                    //map.centerAndZoom(point, 16);
                    point.title = myValue;
                    var tmpMarker = new BMap.Marker(point);
                    myMap._mapObj.addOverlay(tmpMarker);
                    elm.parent().removeClass('has-error');
                    myMap.updateRoute(cid, point);
                    // when click on marker, we show infowindow
                    var infoWin = null;
                    var content = getWindowContent(cid);
                    infoWin = new BMap.InfoWindow(content);
                    tmpMarker.addEventListener("click", function() {
                        var tm = this;
                        tm.openInfoWindow(infoWin);
                        $('#addNote' + cid).click(function() {
                            alert($('#textarea' + cid).val());
                            tm.closeInfoWindow();
                            return false;
                        });
                    });
                    myMap.infoWindows[cid] = infoWin;
                } else {
                    showMsg('无法找到该地点经纬度，请使用其它地点！');
                    return false;
                }
            }, _value.city);
        });
    }
}

function getWindowContent(cid) {
    if (cid == 0)
        cid = 'start';
    else if (cid == (parseInt(myMap.routePoints.length) - 1))
        cid = 'end';
    var content = '<div class="notebox"><div class="title">添加备注</div><textarea id="textarea' + cid + '" cols="20" rows="3"></textarea>';
    content += '<input type="button" id="addNote' + cid + '" value="确定" class="btn btn-block btn-sm btn-primary"/></div>';

    return content;
}

function bindSaveNote(cid) {
    console.log(cid);
    $('#addNote' + cid).click(function() {
        console.log('ddd');
        alert($('#textarea' + cid).val());
        return false;
    });
}

function bindClearMap() {
    $('#clearMap').click(function() {
        myMap.clearMap();
    });
}