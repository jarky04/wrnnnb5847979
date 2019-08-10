angular.module('ionicz.lottery')

.controller('BaseCtrl', ['$scope', 'Lottery', function($scope, Lottery) {
	Lottery.init();

	//默认不显示红包
	if ($scope.appConfig){
		$scope.appConfig.show_bonus_act = 0;
	}

	$scope.gameList = Lottery.getGameList();
	$scope.open = function(path) {
		$window.location.href = path;
	};

}])

.controller('ListCtrl', function($scope, $window, $log, Lottery, $ionicPopover) {
	$log.debug("ListCtrl...");

	//默认不显示红包
	if ($scope.appConfig){
		$scope.appConfig.show_bonus_act = 0;
	}

	$ionicPopover.fromTemplateUrl('/views'+mobileTemplate+'/lottery/templates/list-poper.html', {
		scope: $scope
	}).then(function(popover) {
        $scope.popover = popover;
	});

	$scope.showPoper = function($event) {
		$scope.countMoneyState = 0;
		Lottery.getLotteryData(function(data) {
			$scope.unbalancedMoney = data.unbalancedMoney;
			$scope.countMoneyState = 1;
		});
		$scope.popover.show($event);
	};

	/*var mainTimer = $interval(function() {
		$scope.$broadcast('lotteryListTimer');
	}, 10000);*/

	$scope.$on('$destroy', function() {
		$log.debug('游戏大厅Ctrl销毁，发送广播消息，用于触发销毁定时器');
		// 游戏Ctrl销毁，发送广播消息，用于触发销毁定时器
	    $scope.$broadcast('lotteryListDestroy');
	});

})

.controller('docCtrl', function($scope, $timeout, $log, $filter, $stateParams, $ionicPopover, Lottery, Tools, My, $ionicPopup) {
	$log.debug("docCtrl...");
	//资料打赏1,点击确定也可打赏，保留此触发
	$("#docPayButton").click(function(){
		var id = $("#docPayId").html();
		$ionicPopup.show({
			title:'温馨提示',
			template: '<div style="padding-bottom:10px;">确定打赏，即可浏览VIP资料</div>',
			buttons: [
				{
					text: '取消',
					onTap:function (params) {
						$scope.ionicPopupPay.close();
					}
				},
				{
					type: 'button-positive',
					text: '确认',
					onTap: function(e) {
						$scope.ionicPopupPay.close();
						Tools.ajax({
							url: '/mobile/game/docPay.do?id=' + id,
							method: 'GET',
							success: function(result) {
								Tools.alert(result.msg);
							},
							error: function(error) {
								alert('通信错误');
							},
						});
					}
				}
			]
		});
	});
})

.controller('LotteryCtrl', function($rootScope, $scope, $timeout, $log, $filter, $stateParams, $ionicPopover, $compile, Lottery, Tools, My, $ionicScrollDelegate, $ionicPopup,$location, $ionicSideMenuDelegate) {
	$log.debug("LotteryCtrl...");
	//绑定websocket服务器
	if($scope.appConfig && $rootScope.chat) {
		$scope.chat = $rootScope.chat;
		$scope.chat_server = $rootScope.chat_server;
	}

	var isShowQuick = sessionStorage.getItem('isShowQuick'+$stateParams.gameId);
	if(isShowQuick != 0){
		$scope.additionalLinks = true;
	}else {
		$scope.additionalLinks = false;
	}

	$scope.closeQuick = function () {
		$scope.additionalLinks = false;
		sessionStorage.setItem('isShowQuick'+$stateParams.gameId,0);
	}

	//默认不显示红包
	if ($scope.appConfig){
		$scope.appConfig.show_bonus_act = 0;
		$scope.showReload = $scope.appConfig.filterDOM;
	}

	$scope.changeMoney = function(money){
		if (money > 0){
			if (parseInt($scope.shareData.betMoney) > 0){
				var cur_money = parseInt($scope.shareData.betMoney) + parseInt(money);
			}else{
				var cur_money = money;
			}
		}else{
			var cur_money = '';
		}
		$('#j-money').val(cur_money);
		$scope.shareData.betMoney = cur_money;
	};

	$scope.show_chouma = function() {
		if ($('#chouma_wrap').css('display') == 'none'){
			$('#chouma_wrap').css('display', '');
		}else{
			$('#chouma_wrap').css('display', 'none');
		}
	};
	$scope.gameId = $stateParams.gameId;
	$scope.category = $stateParams.category;
	$scope.catname = decodeURIComponent(decodeURIComponent($stateParams.catname));

	var tpl = {};

	$scope.$on('$destroy', function() {
		$log.debug('游戏Ctrl销毁，发送广播消息，用于触发销毁定时器');
		// 游戏Ctrl销毁，发送广播消息，用于触发销毁定时器
	    $scope.$broadcast('lotteryDestroy');
	});

	Lottery.initGame($scope.gameId, function() {
		$log.debug('--------------init---------------');
		$scope.game = Lottery.getGame($scope.gameId);
		tpl = Lottery.getTpl($scope.gameId);
		$scope.panes = Lottery.getPanes();
		$scope.currPane = Lottery.getDefaultPane();
		$scope.contentTpl = Lottery.getContentTpl($scope.currPane);
		tempContentUrl = $scope.contentTpl;
		$timeout(function() {
			$scope.$broadcast('lotteryInited');
			$scope.$broadcast('initChatWebSocket');
			if($scope.contentTpl){
				//初始化路珠长龙
				$scope.reLoadCfg();
			}
			if($stateParams.id==1){
				$scope.additionalLinks = false;
				$scope.kjLotteryChat('chat');//直接跳转聊天室
			}
			Lottery.initContentTpl(); //预加载模板
		}, 100, false);

	});

	/**
	 * 用于存放与下级作用域共享数据的对象
	 */
	$scope.shareData = {
		betCount: 0 // 当前下注总数
	};

	// 当前游戏选中的下注信息，保存的格式：{"LM": [1001,1003], "Q1": [2001,2002]}
	$scope.betData = {};

	$ionicPopover.fromTemplateUrl('/views'+mobileTemplate+'/lottery/templates/lottery-poper.html', {
		scope: $scope
	}).then(function(popover) {
        $scope.popover = popover;
	});

	$scope.showPoper = function($event) {
		$scope.countMoneyState = 0;
		Lottery.getLotteryData(function(data) {
			$scope.unbalancedMoney = data.unbalancedMoney;
			$scope.totalTotalMoney = data.totalTotalMoney;
			$scope.countMoneyState = 1;
		});
		$scope.popover.show($event);
	};

	$('body').on('click','.popover-backdrop',function (params) {
		$scope.popover.hide();
	});

	$scope.showRole = function() {
		Tools.modal({
			title: $scope.game.name,
			templateUrl: "/mobile/staticdata/gameintro.js/" + $scope.gameId,
			css: 'role-poput',
			callback: function(scope, popup) {
				popup.close();
			}
		});
	};

	$scope.isMore = true;

	var getPage = function() {
		if(!$scope.dataList) {
			return 1;
		}
		var length = $scope.dataList.length;
		if (length < rows) {
			return 1;
		} else {
			return parseInt(length / rows + 1);
		}
	};
	var rows = 10;

	if(!$scope.dataList) {
		$scope.curTotal = 0;
	}else{
		$scope.curTotal = $scope.dataList.length;
	}

	$scope.doRefresh = function() {
		$scope.get_docdata(1);
		$scope.$broadcast('scroll.refreshComplete');
	};

	$scope.onQuery = function() {
		Tools.ajax({
			url: '/mobile/game/getDocdata.do?category=' + $scope.category,
			method: 'GET',
			params: {page: 1, rows: rows},
			success: function(result) {
				$scope.dataList = [];
					$scope.page = 1;
					$scope.totalCount = result.totalCount;
					 if(result && result.totalCount > 0) {
						 if (1==1 || $scope.curTotal < result.totalCount){
							 $scope.dataList = $scope.dataList || [];
							 $scope.dataList = $scope.dataList.concat(result.data);

							if(!$scope.dataList) {
								$scope.curTotal = 0;
							}else{
								$scope.curTotal = $scope.dataList.length;
							}

							 if (rows * 1 < result.totalCount) {
								 $timeout(function(){$scope.isMore = true;}, 1500);
							 }
						 }
					 }
					 else {
						 $scope.dataList = [];
					 }
			}
		});
	};
	$scope.search = {
		text:''
	};
	$scope.get_docdata = function(is_click,isSearch) {
		/* if ((!$scope.isMore && !is_click) || (text == $scope.searchText && is_click && text && !isSearch)) {
			return;
		} */
		var url = '/mobile/game/getDocdata.do?category=' + $scope.category;
		var page = getPage();
		if(isSearch){
			page = 1;
			$scope.isMore = true;
		}
		if ((!is_click && page==1) || is_click){
			Tools.ajax({
				method: 'GET',
				params: {page: page, rows: rows, title:$scope.search.text},
				url: url,
				success: function(result) {
					$scope.page = page;
					$scope.totalCount = result.totalCount;
					 if(result && result.totalCount > 0) {
						 if(isSearch){
							$scope.dataList = [];
							$scope.curTotal = 0;
						 }
						 if ($scope.curTotal < result.totalCount){
							 $scope.dataList = $scope.dataList || [];
							 $scope.dataList = $scope.dataList.concat(result.data);

							if(!$scope.dataList) {
								$scope.curTotal = 0;
							}else{
								$scope.curTotal = $scope.dataList.length;
							}

							 if (rows * page < result.totalCount) {
								 $scope.isMored = '点击获取更多资讯';
								 $timeout(function(){$scope.isMore = true;}, 1500);
							 }else{
								 $scope.isMored = '已无更多资讯';
							 }
						 }
					 }
					 else {
						 $scope.dataList = [];
						 $scope.isMore = false;
					 }
				}
			});

		}

			$scope.$broadcast('scroll.infiniteScrollComplete');
	};
	$scope.get_docdata(0);
	//六合彩公开资料详情
	$scope.ionicPopup = null;
	$scope.ionicPopupPay = null;
	$scope.$on('$destroy', function () {
		if($scope.ionicPopup){
			$scope.ionicPopup.close();
		}
		if($scope.ionicPopupPay){
			$scope.ionicPopupPay.close();
		}
	});
	$scope.showDocDataD = function(id, title, update_time, view_perm, amount) {

		view_perm = parseInt(view_perm);
		amount = parseFloat(amount);
		var docUrl = '/mobile/staticdata/docDetail/'+id+'_'+update_time+'.html';
		//如果有浏览权限，或打赏，则使用动态
		if (view_perm > 0 || amount > 0){
			docUrl = '/mobile/game/getDocDataD.do?id='+id+'&t='+Date.parse(new Date());
		}

		//判断账号权限和是否付费
		var isTest = $rootScope.isTestAccount;
		var isLogin = (!(My.getUserName()));
		if(((isTest || isLogin) && amount>0) || ((isTest || isLogin) && view_perm>0)){
			$scope.ionicPopup = $ionicPopup.show({
				template: '<div style="padding:10px 0 20px 0;text-align:center;color:#FF6600;">该贴注册会员才能阅读，请登录后查看。</div>',
				title: '温馨提示',
				scope: $scope,
				cssClass: 'popupTrans',
				buttons: [
					{
						text: '取消',
					},
					{
						type: 'button-positive',
						text: '登录/注册',
						onTap: function(e) {
							$location.path('/login');
						}
					}
				]
			});
		}else {
			$scope.ionicPopupPay = $ionicPopup.show({
				templateUrl: docUrl,
				title: title,
				scope: $scope,
				cssClass: 'popupTrans',
				buttons: [
					{
						text: '取消',
					},
					{
						type: 'button-positive',
						text: '确定',
						onTap: function(e) {
							if(amount>0 && $('#docPayButton').length > 0){
								var id = $("#docPayId").html();
								$ionicPopup.show({
									title:'温馨提示',
									template: '<div style="padding-bottom:20px;">确定打赏，即可浏览VIP资料</div>',
									scope: $scope,
									cssClass: 'popupTrans',
									buttons: [
										{
											text: '取消',
											onTap:function (params) {
												$scope.ionicPopupPay.close();
											}
										},
										{
											type: 'button-positive',
											text: '确认',
											onTap: function(e) {
												$scope.ionicPopupPay.close();
												$scope.payDoc(id);
											}
										}
									]
								});
							}else {
								$scope.ionicPopupPay.close();
							}
						}
					}
				]
			});
			if($('.popup .popup-body').length>0){
				$('.popup .popup-body').on('click','a',function(){
					$(".button-default").trigger("click");
				})
			}
		}
	};

	//确认打赏
	$scope.payDoc = function (id) {
		//当没有权限时,点击确定则付款
		Tools.ajax({
			url: '/mobile/game/docPay.do?id=' + id,
			method: 'GET',
			success: function(result) {
				Tools.alert(result.msg);
			},
			error: function(error) {
				Tools.alert('通信错误');
			},
		});
		$scope.ionicPopupPay.close();
	}

	//六合彩公开资料详情
	$scope.loginandclose = function() {
		popup.close();
	};
	$scope.contentLoaded = false;
	$scope.selectCate = function(pane) {
		$scope.contentTpl = '';
		$scope.contentLoaded = true;
		$scope.contentTpl = Lottery.getContentTpl(pane);
		if($scope.contentTpl == tempContentUrl) {
			$scope.contentLoaded = false;
		}
		tempContentUrl = $scope.contentTpl;

		$rootScope.$on("$includeContentLoaded", function(event, templateName){
			$scope.contentLoaded = false;
		});
		//if (document.getElementById("audio-bet-side")!=undefined){
			//document.getElementById("audio-bet-side").play();
		//}
		$scope.restartLuzhu();
		if($scope.currPane.multiple === false || pane.multiple === false) {
			$scope.reset();
		}

		$scope.selectSub = null;
		$scope.currPane = pane;
	};

    function replace_em(str) {
    	str = str.replace(/\</g, '&lt;');
    	str = str.replace(/\>/g, '&gt;');
    	str = str.replace(/\n/g, '<br/>');
    	str = str.replace(/\[em_([0-9]*)\]/g, '<img src="/images/arclist/$1.gif" border="0" />');
    	return str;
    }
	//聊天内容的显示和隐藏
	$scope.chatContent = false;
	//公告
	$scope.marquee = true;
	$scope.$on('initChatWebSocket', function() {
	if ($scope.chat) {
		var chatUserListData = [];
		if ("WebSocket" in window){
			var timer = 0;
			var str= navigator.userAgent.toLowerCase();
			var ver=str.match(/cpu iphone os (.*?) like mac os/);
			if(ver){
				$scope.iosVersion = ver[1].replace(/_/g,".").split(".")[0];
			}
			if (!$rootScope.wsObj && $scope.chat_server && $scope.chat) {
				//如果配置开启了websocket服务，并且之前没有连接，那么就创建websocket连接
		    	$rootScope.wsObj =  new WebSocket($scope.chat_server+'?loginsessid='+My.getLoginsessid()+'&logintoken='+My.getLogintoken());
			}
			$scope.wsObj = $rootScope.wsObj;
		    $scope.wsObj.onopen = function(){
			console.log('连接成功...');
			heartCheck.reset().start();
			My.chatTime = Date.parse(new Date());
		    Tools.ajax({
					url: '/Chat/getToken?t=' +My.chatTime,
					params: {
						time :My.chatTime,
					},
					async: false,
					backdrop: true,
					dataType: "json",
					success: function(response) {
						My.token = response.token;
						My.tokenImg = response.tokenImg;
						My.tokenTxt = response.tokenTxt;
						My.username = response.username;
						My.uid = response.uid;
						My.testFlag = response.testFlag;
						My.chatAry = response.chatAry;
						My.announce = response.announce;
						My.ip = response.ip;
						My.level = response.level;
						My.isManager = response.isManager;
						My.isAllBan = response.isAllBan;
						My.isPicBan = response.isPicBan;
						My.roomName = My.oldRName = response.roomName;
						My.roomId = 0;
						My.placeholderFlag = response.placeholderFlag;
						My.placeholder = response.placeholder;
					}
				});
		    };
		    $scope.chat = {};
			$scope.chat.flag = true;
			$scope.chat.lockReconnect = false;
		    $scope.chat.textMsg = {};
		    $scope.chat.textMsg.text = '';
			$scope.chat.heartBeatTim = 10;
			$scope.chat.onmessage = function(evt) {
				heartCheck.reset().start();
				var data = JSON.parse(evt.data);
				if('0' == data.loading){
					if($scope.chat.clean){
						$scope.chat.clean = false;
					}
				}
		        if (data.code == '0000') {
		        	Tools.tip(data.msg);
		        	window.location.reload();
		            return;
		        }else if(data.code == '0888'){
		        	console.log(data.msg);
		        	$(".newWinPop").show();
		            $(".newWinPop").empty().append(data.msg);
		            $("#winGif").fadeIn(1000);
		            $(".newWinPop").animate({right:'10px'}, 1000);
		            var thisTimeout = setTimeout(function(){
		                $("#winGif").hide(100);
		                $(".newWinPop").hide(100);
		                $(".newWinPop").css({'right':'-100%'});
		                clearTimeout(thisTimeout);
		            },3000);
		        }else if(data.code == '0001'){
		        	if($scope.chat.clean){
		        		return;
		        	}
					data.msg = replace_em(data.msg);
		            if (!data.username) {
		                data.username = 'phoenix';
					}

					//用户头像
					if (data.avator === undefined || data.avator === null || data.avator === false || !data.avator) {
						data.avator = "/images/chat/avatar.png";
					}
					if(data.uid == '0000' && !data.avator){
		                data.avator = '/images/chat/sys.png';
		            }
					if (data.data_type == 'image') {
						 if(data.dataType=='1'){
		                    var chatImg = /((ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?)/gi.exec(data.msg);
		                    var chatStr = data.msg.replace(chatImg[1],'');
		                    data.msg =  chatStr + "<img class='chat-img' onclick=\"imgShow('"+chatImg[1]+"')\"  src='" + chatImg[1] + "'>";
		                }else{
		                    data.msg = "<img class='chat-img' onclick=\"imgShow('"+data.msg+"')\"  src='" + data.msg + "'>";
		                }
					}
					data.msg= data.msg.replace(/\\n/g,'<br/>');
					data.msg= data.msg.replace(/\\/g,'');
					var betJson = '';
					if(data.betFollowFlag){
						betJson = JSON.stringify(data.betUrl);
					}

					if (data.uid == My.uid) {
						if(data.isManager){
		                    var spanImg = '<span style="float:right;"><img style="height:15px; width:63px;" src="/images/chat/icon_master.gif" alt="管理员"></span>';
		                }else{
							if(data.levelImg === undefined || data.levelImg === null || data.levelImg === false){
			                    var spanImg = '';
			                }else{
			                    var spanImg = '<span style="float:right;"><img style="height:15px; width:72px;" src="'+data.levelImg+'" alt="会员等级"></span>';
			                }
			            }
			            if(data.ip){
			            	var title = 'title='+data.ip;
			            }else{
			            	var title = '';
			            }
			            if(data.usernameBak){
			            	var usernameBak = 'data-username='+data.usernameBak;
			            }else{
			            	var usernameBak = '';
			            }
						$scope.nickname = data.username;
						var chat_html = '';
						if(data.betFollowFlag){
							chat_html = '<li id="'+data.uid+data.t+'" '+usernameBak+' '+title+' class="row mine"  style="">'
											+'<div class="msg-detail col">'
											+    '<div class="info" >'
											+        '<span  class="ownName user-nick ng-binding" >'
											+ 		data.username
											+ 		 '</span>'
											+ 		spanImg
											+        '<span class="msg-date ng-binding">' + data.time + '</span>'
											+    '</div>'
											+    '<div class="textwrap" >'
											+'<div  class="ng-binding text chat-style-' + Math.ceil(Math.random() * 4) + '">'
											+			'<div class="message_cont">'
											+        	data.msg
											+			'</div>'
											+			'<button class="follow_up"  data-param='+betJson+'>跟注'
											+			'</button>'
											+        '</div>'
											+    '</div>'
											+'</div>'
											+'<div  class="user-head col col-15" >'
											+    '<div class="wrap chatMessageList">'
											+'<img class="ownAvator" alt="" src="' + data.avator + '">'
											+   ' </div>'
											+'</div>'
											+'</li>';
						}else{
							chat_html = '<li id="'+data.uid+data.t+'" '+usernameBak+' '+title+' class="row mine"  style="">'
											+'<div class="msg-detail col">'
											+    '<div class="info" >'
											+        '<span  class="ownName user-nick ng-binding" >'
											+ 		data.username
											+ 		 '</span>'
											+ 		spanImg
											+        '<span class="msg-date ng-binding">' + data.time + '</span>'
											+    '</div>'
											+    '<div class="textwrap" >'
											+'<div  class="ng-binding text chat-style-' + Math.ceil(Math.random() * 4) + '">'
											+			'<div class="message_cont">'
											+        	data.msg
											+			'</div>'
											+        '</div>'
											+    '</div>'
											+'</div>'
											+'<div  class="user-head col col-15" >'
											+    '<div class="wrap chatMessageList">'
											+'<img class="ownAvator" alt="" src="' + data.avator + '">'
											+   ' </div>'
											+'</div>'
											+'</li>';
						}
					}else{
						if(data.isManager){
		                    var spanImg = '<span style="float:left;"><img style="height:15px; width:63px;" src="/images/chat/icon_master.gif" alt="管理员"></span>';
		                }else{
							if(data.levelImg === undefined || data.levelImg === null || data.levelImg === false){
			                    var spanImg = '';
			                }else{
			                    var spanImg = '<span style="float:left;"><img style="height:15px; width:72px;" src="'+data.levelImg+'" alt="会员等级"></span>';
			                }
			            }
			            if(data.ip){
			            	var	 title = 'title='+data.ip;
			            }else{
			            	var title = '';
			            }
			            if(data.usernameBak){
			            	var usernameBak = 'data-username='+data.usernameBak;
			            }else{
			            	var usernameBak = '';
			            }
			            var privateChatMenu = '';
		                if(!My.isManager){
		                    if(data.isManager && !data.isChatCron){
		                        var privateChatMenu = 'title='+data.uid+','+data.uid+data.t;
		                    }
						}
						var chat_html = '';
						if(data.betFollowFlag){
							chat_html = '<li id="'+data.uid+data.t+'" '+usernameBak+' '+title+' class="row"  style="" dataid="'+data.uid+'">'
											+'<div  '+privateChatMenu+' class="user-head col col-15" >'
											+    '<div class="wrap chatMessageList">'
											+		'<img class="' + data.uid + '" alt="" src="' + data.avator + '">'
											+   ' </div>'
											+'</div>'
											+'<div class="msg-detail col">'
											+    '<div class="info" >'
											+       ' <span style="float:left;" class="name' + data.uid + ' user-nick ng-binding">'+ data.username + '</span>'
											+ 		spanImg
											+        '<span class="msg-date ng-binding">' + data.time + '</span>'
											+    '</div>'
											+    '<div class="textwrap" >'
											+'<div  class="ng-binding text chat-style-' + Math.ceil(Math.random() * 4) + '" >'
											+			'<div class="message_cont">'
											+        	data.msg
											+			'</div>'
											+			'<button class="follow_up" data-param='+betJson+'>跟注'
											+			'</button>'
											+        '</div>'
											+    '</div>'
											+'</div>'
										+'</li>';
						}else{
							chat_html = '<li id="'+data.uid+data.t+'" '+usernameBak+' '+title+' class="row"  style="" dataid="'+data.uid+'">'
											+'<div  '+privateChatMenu+' class="user-head col col-15" >'
											+    '<div class="wrap chatMessageList">'
											+		'<img class="' + data.uid + '" alt="" src="' + data.avator + '">'
											+   ' </div>'
											+'</div>'
											+'<div class="msg-detail col">'
											+    '<div class="info" >'
											+       ' <span style="float:left;" class="name' + data.uid + ' user-nick ng-binding">'+ data.username + '</span>'
											+ 		spanImg
											+        '<span class="msg-date ng-binding">' + data.time + '</span>'
											+    '</div>'
											+    '<div class="textwrap" >'
											+'<div  class="ng-binding text chat-style-' + Math.ceil(Math.random() * 4) + '" >'
											+			'<div class="message_cont">'
											+        	data.msg
											+			'</div>'
											+        '</div>'
											+    '</div>'
											+'</div>'
										+'</li>';
						}
					}

					if(data.dataType == '1'){
						var pri_chat = 'pri'+data.roomId;
						$rootScope[pri_chat] += chat_html;
						$rootScope.pri_chat_html += chat_html;
						$rootScope.pri_chat_html = $rootScope.pri_chat_html.replace('undefined','');
						$rootScope[pri_chat] = $rootScope[pri_chat].replace('undefined','');
		                $('.chat-room#'+data.roomId).find("#private-chat-list").append(chat_html);
		          //       $(".chat-room").each(function(){
				        //     if($(this).css("display")!='none'){
				        //         $(this).find("#private-chat-list").append(chat_html);
				        //     }
			        	// });
		                if(data.chatId && $(".private-chat-list").attr("title") == ''){
		                    if(My.isManager){
		                        $(".private-chat-list").attr("title",data.usernameBak);
		                    }else{
		                        $(".private-chat-list").attr("title",data.username);
		                    }
		                    $(".private-chat-list").data("chatid",data.chatId);
		                }
		                if(data.historyFlag != '1' && !$scope.privateChatFlag  && data.chatId && $('#chat-items').css("display")!='none'){
							$scope.chatTimer = setInterval($scope.blinkWords, 600);
						}
		            }else{
		            	var pub_chat = 'pub'+data.roomId;
		            	$rootScope[pub_chat] += chat_html;
		            	$rootScope.chat_html += chat_html;
		            	$rootScope[pub_chat] = $rootScope[pub_chat].replace('undefined','');
						$rootScope.chat_html = $rootScope.chat_html.replace('undefined','');
		                $('.chat-room#'+data.roomId).find("#chat-list").append(chat_html);
		          //       $(".chat-room").each(function(){
				        //     if($(this).css("display")!='none'){
				        //         $(this).find("#chat-list").append(chat_html);
				        //     }
						// });
					}

					if($(".chat-content").length > 0) {
						if($scope.doLoad){
							var startTime = new Date().getTime();
							var interval = setInterval(function(){
								if(new Date().getTime() - startTime > (data.data_type == 'image'?2000:500)){
									clearInterval(interval);
									return;
								}
								$scope.doRoll();
							}, 100);
						}else{
							$('.news').show();
							$scope.news_count = ++$scope.news_count;
						}
					}
				} else if (data.code == '-1'){
					Tools.tip(data.msg);
					$('.chatMenuContainer').hide();
				} else if (data.code == '0006' && data.type_id == '0002' && data.uid) {
					//试玩用户
					$rootScope.userId = data.uid;
				} else if (data.code == '0005') {
					$scope.updataOnlineUserList(data.chatUsers);
					//正式用户
					// $rootScope.userId = data.uid;
				}else if( data.code == '0007'){
					//后台禁止注册用户发言
					Tools.tip(data.msg);
				}else if( data.code == '0008'){
					//后台禁止试玩用户发言
					Tools.tip(data.msg);
				}else if( data.code == '0009'){
					//绑定银行卡才可发言
					Tools.tip(data.msg);
				}else if( data.code == '0010'){
					//充值才可发言
					Tools.tip(data.msg);
				}else if( data.code == '0011'){
					//全体禁言
					Tools.tip(data.msg);
				}else if( data.code == '0012'){
					//聊天室未开启
					Tools.tip(data.msg);
				}else if( data.code == '0014'){
					//修改头像
					$("img.ownAvator").attr('src',data.image);
					Tools.tip(data.msg);
				}else if( data.code == '0024'){
					//更新头像显示
					$("img."+data.uid).attr('src',data.image);
					$(".avatar"+data.uid).attr('src',data.image);
					$rootScope.chat_html = $(".chat-list").html();
					$rootScope.pri_chat_html = $(".private-chat-list").html();
				}else if( data.code == '0015'){
					//修改昵称
					$scope.nickname = data.nickname;
					$("span.ownName").html(data.nickname);
					Tools.tip(data.msg);
				}else if( data.code == '0025'){
					//更新其他用户显示新昵称
					$("span.name"+data.uid).html(data.nickname);
					if(data.listName){
		                $(".nameOnline"+data.uid).html(data.listName);
		            }
					$rootScope.chat_html = $(".chat-list").html();
					$rootScope.pri_chat_html = $(".private-chat-list").html();
            		return;
				} else if (data.code == '0016' || data.code == '1005' || data.code == '2005' || data.code == '3005' ||
				 data.code == '1007' || data.code == '2007' || data.code == '3007' || data.code == '1008' || data.code == '2008' || data.code == '3008') {
					//通知
					var chatroomNewComming_html = '<p class="chatroomNewComming">' + data.msg + '</p>';
					$("#chatroomNewComming").append(chatroomNewComming_html);
					setTimeout(function(){
						$(".chatroomNewComming").eq(0).remove()
					},3000);
					$('.chatMenuContainer').hide();
				} else if (data.code == '0017') {
					//用户上线通知
					var chatroomNewComming_html = '<p class="chatroomquit">' + data.msg + '</p>';
					$("#chatroomNewComming").append(chatroomNewComming_html);
					setTimeout(function(){
						$(".chatroomquit").eq(0).remove()
					},3000);
				}else if(data.code == '0026'){
		            $("#"+data.historyId).remove();
		            return;
				 }else if (data.code == '0027') {
				//0027 删除聊天记录

					$("#chat_history_" + data.history_id).remove();

				}else if (data.code == '0022') {
					//搜索会员
					var tempListData = [];
					tempListData.push(data);
					$scope.updataOnlineUserList(tempListData,1);
				}

			};

		    $scope.chat.sendMessage = function(betFollowFlag, labelCont, betUrl){
				if($scope.chat.flag){
					$scope.chat.showMore(true);
					var msg = '';
					var thisBetFollowFlag = false;
					var thisBetUrl = '';
					if(betFollowFlag == true && betFollowFlag != 'undefined'){
						thisBetFollowFlag = betFollowFlag;
						msg = labelCont;
						thisBetUrl = betUrl;
					}else{
						var msgCont = $scope.chat.textMsg.text||$('#chatTextarea').val();
						msg = $.trim(msgCont);
						thisBetFollowFlag = false;
					}
					if (msg == '') {
						Tools.tip('信息不能为空');
						return;
					}
					$scope.chat.flag = false;
					setTimeout(function(){
						$scope.chat.flag = true;
					}, 300);
					var roomId = 0, chat_type = 0 ,chatUid, chatName = '';
					$(".chat-room").each(function(){
			            if($(this).css("display")!='none'){
							roomId = $(this).attr('id');
			                if($(this).find('#chat-list').css("display")=='none'){
				                 chat_type = 1; //私聊
				                 chatUid = $(".private-chat-list").data("chatid");
				                 chatName = $(".private-chat-list").attr("title");
				            }else{
				                 chat_type = 0; //公聊
				                 chatUid = '';
				                 chatName = '';
				            }
			            }
			        });
			        Tools.ajax({
						method: 'POST',
						url: '/Chat/checkChatMsgCron',
						success: function(g) {
							if(g=='500'){
								Tools.tip('该时段禁止聊天');
								return;
							}else{
								var chat_message_obj = {
									'code': '0001',
									'betFollowFlag': thisBetFollowFlag,
									'betUrl': thisBetUrl,
									'msg': msg,
									'roomId' : roomId,
									'chat_type'   : chat_type,
					                'chatUid'   : chatUid,
					                'chatName'   : chatName,
									'level': My.level,
									'ip' : My.ip,
									't':My.chatTime,
									'username': My.username,
									'token': My.token,
								}
								var chat_message = JSON.stringify(chat_message_obj);
								$scope.wsObj.send(chat_message);
								$scope.doRoll();
								$scope.chat.textMsg.text = '';
								$('#chatTextarea').val('');
							}
						}
					});
				}

			};

			$scope.wsObj.onmessage = function (evt) {
				$scope.chat.onmessage(evt);
		    };

			$scope.wsObj.onclose = function() {
				// 关闭 websocket
				console.log("连接已关闭...");
				reconnect();
			};

			$scope.wsObj.onerror = function (err) {
				console.log("连接已关闭..");
				reconnect();
			};

			// 重连
			function reconnect() {
				if ($scope.chat.lockReconnect) return;
				$scope.chat.lockReconnect = true;
				setTimeout(function () {
					createWebSocket();
					$scope.chat.lockReconnect = false;
				}, 4000);
			}

			function createWebSocket() {
				try {
					if ('WebSocket' in window) {
						$rootScope.wsObj =  new WebSocket($scope.chat_server+'?loginsessid='+My.getLoginsessid()+'&logintoken='+My.getLogintoken());
					} else if ('MozWebSocket' in window) {
						$rootScope.wsObj =  new WebSocket($scope.chat_server+'?loginsessid='+My.getLoginsessid()+'&logintoken='+My.getLogintoken());
					} else {
						console.log("当前浏览器不支持websocket");
					}
					$scope.wsObj = $rootScope.wsObj;
					initEventHandle();
				} catch (e) {
					reconnect();
				}
			}

			var heartCheck = {
				timeout: $scope.chat.heartBeatTim*60*1000,
				timeoutObj: null,
				reset: function () {
					clearTimeout(this.timeoutObj);
					return this;
				},
				start: function () {
					var self = this;
					this.timeoutObj = setTimeout(function () {
						$scope.wsObj.close();
					},this.timeout)
				}
			}

			function initEventHandle() {
				$scope.wsObj.onclose = function () {
					reconnect();
				};
				$scope.wsObj.onerror = function (err) {
					reconnect();
				};
				$scope.wsObj.onopen = function () {
					console.log('重新连接成功...');
					$scope.chat.clean = true;
					heartCheck.reset().start();
				};
				$scope.wsObj.onmessage = function (msg) {
					// if($scope.chat.clean){
					// 	$scope.chat.clean = false;
					// 	$scope.doClean();
					// };
					$scope.chat.onmessage(msg);
				};
			}

			$scope.chat.showMore = function (flag) {
				if(flag){
					$('.chatfooter.bar-footer').height('55')
					return
				}
				if($scope.chat.flag){
					$scope.chat.flag = false;
					if($('.chatfooter.bar-footer').height()>60){
						$('.chatfooter.bar-footer').height('55')
					}else{
						 $scope.chat.emotion();
						$('.chatfooter.bar-footer').height('96')
					}
					setTimeout(function(){
							$scope.chat.flag = true;
					}, 300)
				}
			};

			$scope.chat.emotion = function () {
				  $('.emotion').qqFace({
						assign:'chatTextarea', //给输入框赋值
						path:staticServer+'/images/arclist/',    //表情图片存放的路径
						width:$('.pane').width()||320
				  });
			};

			$scope.blinkWords= function () {
				$('.privateChat').css('color','#FF0000');
				setTimeout(" $('.privateChat').css('color','#003fc0')",100); //第一次闪烁
				setTimeout( "$('.privateChat').css('color','#000')",200); //默认值
			};

			$scope.setup = true;
			$scope.showSetup = function () {
				$scope.setup = !$scope.setup;
				$scope.chat.showMore(true);
			}

			$scope.showChatMenu = function () {
				if(My.isManager){
					$('.chatMenuContainer').show();
				}
			}
			$scope.closeChatModal = function (params) {
				$('.chatMenuContainer').hide();
			}

			//跟注: 1.跳转到指定游戏界面， 2.显示投注清单， 3.点击确定投注， 4.投注成功后分享投注
			$('body').off('click','.follow_up').on('click','.follow_up',function () {
				var para = $(this).attr("data-param");
				var JsonParam = JSON.parse(para);
				if($scope.gameId == JsonParam.gameId){
					$scope.kjLotteryChat('lottery');
				} else{
					$location.path('/lottery/index/' + JsonParam.gameId);    //跳转到指定游戏界面
				}
				// console.log(JsonParam, 'JsonParam');
				setTimeout(function(){
					$scope.gameId == JsonParam.gameId;
					$scope.shareData.betMoney = JsonParam.singleAmount;
					$scope.shareData.betCount = JsonParam.totalNums;
					var dataList = [];
					for (var index = 0; index < JsonParam.totalNums; index++) {
						var element = JsonParam["betBean["+index+"][playId]"];
						dataList.push(element);
					}
					$scope.betData[JsonParam.paneCode] = dataList;

					$scope.bet({'gameId': JsonParam.gameId, 'isFollowUp':true, 'turnNum': JsonParam.turnNum, 'betParams': JsonParam});
				}, 500);

			});

			$('body').on('click','.user-head',function (params) {
				var privateChatData = $(this).attr('title');
				if(privateChatData && !My.isManager){
					privateChatData = privateChatData.split(',');
					var uid = privateChatData[0];
					var chatUid = privateChatData[1];
					$('.chatMenuContainer').show();
			        $('.chatMenuContainer li.privateMsg').removeAttr("style");
			        $('.chatMenuContainer li.delChatMessage').hide();
			        $('.chatMenuContainer li.forbiddenWords').hide();
			        $('.chatMenuContainer li.releaseWords').hide();
			        $('.chatMenuContainer li.forbiddenIP').hide();
			        $('.chatMenuContainer li.releaseIP').hide();
			        $('.chatMenuContainer li.forbiddenNickname').hide();
			        $('.chatMenuContainer li.releaseNickname').hide();
			        var username = $('.name'+uid).html();
			        if(username){
			             $('.chatMenuContainer li.privateMsg').html('私聊管理员：'+username);
			             $(".private-chat-list").attr("title",username);
			        }
			        $(".private-chat-list").data("chatid",chatUid);
			        $('.privateMsg').unbind('click');
			        $('.privateMsg').click(function(){
			            $scope.privateChat();
			        });
				}

			});
			$('body').on('click','.chatMessageList',function (params) {
				$scope.showChatMenu();
				var title = $(this).parent().parent().attr('title');
				var usernameBak = $(this).parent().parent().data('username');
				if(title === undefined || title === null || title == 'false' || !title || title === false){
	                $('.chatMenuContainer li.forbiddenIP').html('禁言IP：暂未发言未记录IP');
	                $('.chatMenuContainer li.releaseIP').html('解除禁言IP：暂未发言未记录IP');
	            }else{
	                $('.chatMenuContainer li.forbiddenIP').html('禁言IP：'+title);
	                $('.chatMenuContainer li.releaseIP').html('解除禁言IP：'+title);
	            }
	            if(usernameBak){
	            	$('.chatMenuContainer li.forbiddenWords').html('禁言玩家：'+usernameBak);
                	$('.chatMenuContainer li.releaseWords').html('解除玩家禁言：'+usernameBak);
                	$('.chatMenuContainer li.privateMsg').html('私聊：'+usernameBak);
                	$('.chatMenuContainer li.privateMsg').attr('title',usernameBak);
	            }
				var id = $(this).parent().parent().attr('id');
				$('.chatMenuContainer li.privateMsg').data('chatid',id);
				$scope.tempHistoryId = id;
				$scope.title = title;
				$scope.tempUid = $(this).parent().parent().attr('dataid');
				$('.delChatMessage').show();
			});
			$('body').on('click','.userListItem',function (params) {
				var title = $(this).attr('title');
				var usernameBak = $(this).data('username');
				$(".private-chat-list").attr("title",usernameBak);
				if(title === undefined || title === null || title == 'null' || !title || title === 'false'){
	                $('.chatMenuContainer li.forbiddenIP').html('禁言IP：暂未发言未记录IP');
	                $('.chatMenuContainer li.releaseIP').html('解除禁言IP：暂未发言未记录IP');
	            }else{
	                $('.chatMenuContainer li.forbiddenIP').html('禁言IP：'+title);
	                $('.chatMenuContainer li.releaseIP').html('解除禁言IP：'+title);
	            }
	            if(usernameBak){
	            	$('.chatMenuContainer li.forbiddenWords').html('禁言玩家：'+usernameBak);
                	$('.chatMenuContainer li.releaseWords').html('解除玩家禁言：'+usernameBak);
                	$('.chatMenuContainer li.privateMsg').html('私聊：'+usernameBak);
                	$('.chatMenuContainer li.privateMsg').attr('title',usernameBak);
	            }
				$scope.showChatMenu();
				var id = $(this).attr('id');
				$scope.tempUid = id;
				$('.chatMenuContainer li.privateMsg').data('chatid',id);
				$(".private-chat-list").data("chatid",id);
				$scope.title = title;
				$('.delChatMessage').hide();
			});

			$scope.updataOnlineUserList = function (chatUserListData,type) {
				$('.userListItem').remove();
				var $chat_user_list = '';

				if(chatUserListData){
					for(var i=0;i<chatUserListData.length;i++){
						var item = chatUserListData[i];
						if (item.avator === undefined || item.avator === null || item.avator === false || !item.avator) {
							item.avator = '/images/chat/avatar.png';
						}
			            var title = 'title='+item.chatIP;
			            var usernameBak = 'data-username='+item.usernameBak;
						$chat_user_list += '<div class="wrap userListItem" '+usernameBak+' '+title+' id="'+item.uid+Date.parse(new Date()).toString().substr(0,10)+'">'
									+		'<img class="avator' + item.uid + '" alt="" src="' + item.avator + '">'
									+		'<span class="nameOnline'+item.uid+'">'+item.username+'</span>'
									+   ' </div>';
					}
				}
				$('.chatUserListContainer').append($chat_user_list);
			}

			$scope.searchOnlineUser = function (params) {
				var userName = $('.onlineUserValue').val();
				var t = JSON.stringify(Date.parse(new Date()) / 1000);
				var condition = $('.selectSearchType select').select().val();
				var chat_message_obj = {
					'code'          : '0002',
					't'             :My.chatTime,
					'username'      : My.username,
					'condition'     : condition,
					'value'         : userName,
					'token'         : My.token,
		            'level'			: My.level,
				}
				var chat_message = JSON.stringify(chat_message_obj);
		        $scope.wsObj.send(chat_message);
			}

			//发送图片
			$scope.chat.sendImage = function(imgData){
				lrz(document.querySelector('#imgUploadInput').files[0],{width: 800})
					.then(function (rst) {
						// 处理成功会执行
						$(".chat-room").each(function(){
				            if($(this).css("display")!='none'){
				                roomId = $(this).attr('id');
				                if($(this).find('#chat-list').css("display")=='none'){
					                 chat_type = 1; //私聊
					                 chatUid = $(".private-chat-list").data("chatid");
					                 chatName = $(".private-chat-list").attr("title");
					            }else{
					                 chat_type = 0; //公聊
					                 chatUid = '';
					                 chatName = '';
					            }
				            }
				        });
				        Tools.ajax({
							method: 'POST',
							url: '/Chat/checkChatMsgCron',
							success: function(g) {
								if(g=='500'){
									Tools.tip('该时段禁止聊天');
									return;
								}else{
									var chat_message_obj = {
										'code'          : '0001',
										'msg'           : rst.base64,
										'roomId' 		: roomId,
										'chat_type'   : chat_type,
						                'chatUid'   : chatUid,
						                'chatName'   : chatName,
										'data_type'		: 'image',
										't'				: My.chatTime,
										'ip'			: My.ip,
										'username'      : My.username,
										'token'         : My.tokenImg,
									}
									var chat_message = JSON.stringify(chat_message_obj);
									$scope.wsObj.send(chat_message);
									$scope.doRoll();
									$scope.chat.textMsg.text = '';
								}
							}
						});

					})
					.catch(function (err) {
						// 处理失败会执行
					})
					.always(function () {
						// 不管是成功失败，都会执行
					});
			};
			$scope.showPrivateChat = function(){
				$(".chat-room").each(function(){
		            if($(this).css("display")!='none'){
		                if($(this).find('#private-chat-list').css('display')=='none'){
							$('.chatUserListContainer').hide();
							$scope.chat.nickname.popup = false;
							$(this).find('#chat-list').hide();
							$(this).find('#private-chat-list').show();
							$scope.privateChatFlag = true;
						}else{
							$('.chatUserListContainer').hide();
							$scope.chat.nickname.popup = false;
							$(this).find('#chat-list').show();
							$(this).find('#private-chat-list').hide();
							$scope.privateChatFlag = false;
							$scope.doRoll();
						}
		            }
					clearInterval($scope.chatTimer);
		        });
			}
			$scope.privateChat = function(){
				$scope.setup = true;
				$scope.privateChatFlag = true;
				clearInterval($scope.chatTimer);
				$(".chat-room").each(function(){
		            if($(this).css("display")!='none'){
		                $(this).find('#chat-list').hide();
						$(this).find('#private-chat-list').show();
		            }
		        });
				$('.chatUserListContainer').hide();
				$scope.chat.nickname.popup = false;
				$("#chatTextarea").removeAttr("disabled");
				var username = $('.chatMenuContainer li.privateMsg').attr('title');
				var chatUid = $('.chatMenuContainer li.privateMsg').data('chatid');
				if(username){
		            $(".private-chat-list").attr("title",username);
		        }
		        $(".private-chat-list").data("chatid",chatUid);
		        $('.chatMenuContainer').hide();
			}
			$scope.tempHistoryId = '';
			$scope.tempUid = '';
			$scope.showOnlineUserList = function () {
				$('.chatUserListContainer').show();
			}

			$scope.closeSearchList = function () {
				$('.chatUserListContainer').hide();
			}
			//修改头像
			$scope.chat.sendAvatar = function () {
				lrz(document.querySelector('#avatarUploadInput').files[0],{width: 100})
					.then(function (rst) {
						// 处理成功会执行
						var chat_message_obj = {
							'code'          : '0003',
							'data_type'		: 'image',
							'msg'           : rst.base64,
							't'				:My.chatTime,
							'username'      : My.username,
							'token'         : My.tokenImg,
						}
						var chat_message = JSON.stringify(chat_message_obj);
						$scope.wsObj.send(chat_message);

					})
					.catch(function (err) {
						// 处理失败会执行
					})
					.always(function () {
						// 不管是成功失败，都会执行
					});
			};

			// 修改昵称
			$scope.chat.nickname = {};

			$scope.chat.nickname.popup = false; //默认隐藏“修改昵称的弹窗”

			$scope.chat.nickname.showpopup = function () {
			//显示“修改昵称的弹窗”

				$scope.chat.nickname.popup = true;

			};
			$scope.chat.nickname.change =function () {
				$scope.nickname = $("#chatNickname").val();
			}
			$scope.chat.nickname.cancel = function () {
			//取消修改昵称
				$scope.chat.nickname.popup = false;
			};

			$scope.chat.nickname.confirm = function () {
			//确认修改昵称
				Tools.ajax({
					method: 'POST',
					params: {
						uid : My.uid,
                		nickname : $scope.nickname,
					},
					url: '/Chat/updateNickname',
					success: function(res) {
						if(res.code == '-1'){
							Tools.tip(res.msg);
							return;
						}else{
							var chat_message_obj = {
								'code'			: '0004',
								'data_type'		: 'text',
								't'				: My.chatTime,
								'msg'			: $scope.nickname,
								'username'		: My.username,
								'token'         : My.tokenTxt,
							}
							var chat_message = JSON.stringify(chat_message_obj);
							$scope.wsObj.send(chat_message);

							$scope.chat.nickname.popup = false;
						}
					}
				});
			};

			$scope.chat.textFocus = function(){
				if(($scope.iosVersion<11 || document.body.scrollTop>0)){
					timer = setInterval(function() {
					var pannel = document.getElementById("chatTextarea");
						document.body.scrollTop = document.body.scrollHeight;
				   }, 400);
				}
				//iphone X 待定
			};
			//删除留言
			$scope.delChatMessage = function() {
				var chat_message_obj = {
					'code'          : '0006',
					't'             :My.chatTime,
					'username'      : My.username, // 管理员用户名
					'historyId'     : $scope.tempHistoryId,
					'token'         : My.token,
		            'level'			: My.level
				}
				var chat_message = JSON.stringify(chat_message_obj);
				$scope.wsObj.send(chat_message);
			}
			//禁言玩家
			$scope.forbiddenwords = function(isDisabled) {
				var time = 10;
				var chat_message_obj = {
					'code'          : '0005',
					't'             : My.chatTime,
					'username'      :  My.username, // 管理员用户名
					'chatUid'           : $scope.tempUid,     //用户uid
					'talkPri'       : isDisabled, // 1 为禁止 0为允许
					'time'          : time, //禁言时间 单位分  ，最长不超过10天
					'token'         : My.token,
					'level'			: My.level
				}
				var chat_message = JSON.stringify(chat_message_obj);
				$scope.wsObj.send(chat_message);
			}
			//禁言IP
			$scope.forbiddenIP = function(isDisabled) {
				var time = 10;
				var chat_message_obj = {
					'code'          : '0008',
					't'             : My.chatTime,
					'username'      :  My.username, // 管理员用户名
					'ip'			: My.ip,
					'chatUid'           : $scope.tempUid,     //用户uid
					'talkPri'       : isDisabled, // 1 为禁止 0为允许
					'time'          : time, //禁言时间 单位分  ，最长不超过10天
					'token'         : My.token,
					'level'			: My.level
				}
				var chat_message = JSON.stringify(chat_message_obj);
				$scope.wsObj.send(chat_message);
			}
			$scope.forbiddenNickname = function(isDisabled) {
			//禁用，解除昵称禁用
				if(isDisabled == '1'){
		            var nickname = '昵称已被禁用';
		            var isDisabled = 1;
		        }else{
		            var isDisabled = 2;
		        }
				Tools.ajax({
					method: 'POST',
					params: {
						uid : $scope.tempUid,
                		nickname : nickname,
                		isDisabled : isDisabled,
					},
					url: '/Chat/updateNickname',
					success: function(res) {
						if(res.code == '-1'){
							Tools.tip(res.msg);
							return;
						}else{
							var time = 10;
							var chat_message_obj = {
								'code'          : '0007',
								't'             : My.chatTime,
								'username'      : My.username, // 管理员用户名
								'chatUid'           : $scope.tempUid,     //用户uid
								'nicknamePri'       : isDisabled, // 1 为禁用 0为解禁
								'time'          : time, //禁用时间 单位分  ，最长不超过10天
								'token'         : My.token,
								'level'			: My.level
							}
							var chat_message = JSON.stringify(chat_message_obj);
							$scope.wsObj.send(chat_message);
						}
					}
				});
			}

			$scope.chat.textBlur = function(){
				if($scope.iosVersion<11 || document.body.scrollTop>0){
					clearInterval(timer);
				}

		    };
		}else{
			// 浏览器不支持 WebSocket
			alert("当前浏览器或者手机不支持websocket!");
		}

		$scope.doRoll = function(flag){
			if(flag){
				$('.chat-content').animate({"scrollTop":$('.chat-content')[0].scrollHeight},500);
			}else{
				setTimeout(function(){
					$('.chat-content').scrollTop($('.chat-content')[0].scrollHeight);
				},200)

			}
		};

		$scope.doClean = function(){
			 if($("#private-chat-list").is(":hidden")){
				  $("#"+My.roomId +" #chat-list").html('');
			 }else{
				  $("#private-chat-list").html('');
			 }
		}

		$scope.closeMarquee = function(){
			$scope.marquee = false;
		}

		$scope.showChatRoom = function(){
			$scope.chatRoom = !$scope.chatRoom;
		}

		$scope.changeRoom = function(room){
			if(My.roomId != room.roomId){
				My.roomId = room.roomId;
				My.roomName = room.roomName;
				$scope.doRoll();
			}
			$scope.chatRoom = false;
		}

		$scope.$watch('My.chatAry', function() {
			$scope.initChatRoom();
		});

		$scope.initChatRoom = function(){
			if(My.chatAry){
				My.roomId = 0;
				My.roomName = My.oldRName;
				for(var i=0;i<My.chatAry.length;i++){
					if($scope.gameId == My.chatAry[i].typeId){
						My.roomId =  My.chatAry[i].roomId;
						My.roomName = My.chatAry[i].roomName;
						break;
					}
				}
			}
		}

		//聊天室按钮
		$scope.kjLotteryChat = function(section) {
			if (section == 'lottery' ) {
				$scope.chatContent = false;
				$(".kj-lottery").addClass('bg-chat-bt-active');
				$(".kj-lottery").removeClass('bg-chat-bt');
				$(".kj-chat").addClass('bg-chat-bt');
				$(".kj-chat").removeClass('bg-chat-bt-active');
			}else{
				if(!$scope.chatContent){
					$scope.chatContent = true;
					$scope.doLoad = true;
					$scope.news_count = 0;
					$(".kj-lottery").addClass('bg-chat-bt');
					$(".kj-lottery").removeClass('bg-chat-bt-active');
					$(".kj-chat").addClass('bg-chat-bt-active');
					$(".kj-chat").removeClass('bg-chat-bt');
					setTimeout(function(){
						$(".chat-list").each(function(){
							var roomId = $(this).parent().attr('id');
							var pub_chat = 'pub' + roomId;
							$(this).html($rootScope[pub_chat]);
						});
						$(".private-chat-list").each(function(){
							var roomId = $(this).parent().attr('id');
							var pri_chat = 'pri' + roomId;
							$(this).html($rootScope[pri_chat]);
						});
						var startTime = new Date().getTime();
						var interval = setInterval(function(){
							if(new Date().getTime() - startTime > 3000){
								clearInterval(interval);
								return;
							}
							if($('.chat-content').length>0){
								$scope.doRoll();
							}
						}, 1000);
						$('.chat-content').scroll(function(){
						　　var scrollTop = $(this).scrollTop();
						　　var scrollHeight = $('.chat-content')[0].scrollHeight;
						　　var windowHeight = $(this).height();
						　　if(scrollTop + windowHeight >= scrollHeight -55){
						　　　　//到底部了
								$('.news').hide();
								$scope.doLoad = true;
								$scope.news_count = 0;
						　　}else{
								$('.news').show();
								$scope.doLoad = false;
							}
						});
					},1000);
				}

			}
		}
		$(".lottery-menu").addClass('lottery-menu-chat');
		var kjStyle = "<style>"
					+".lotter-view .lottery-bet .bet-view {"
					+"   top: calc( 3.9rem + 30px ) !important;"
					+"}"
					+"</style>";
		$(".kj-style").html(kjStyle);
	}
});

	/**
	 * 判断玩法ID是否已经选中
	 */
	$scope.isExist = function(dataId) {
		var dataList = $scope.betData[$scope.currPane.code] || [];
		return dataList.indexOf(dataId) > -1;
	};

	/**
	 * 选中
	 */
	$scope.addDataId = function(dataId) {
		var paneCode = $scope.currPane.code;
		if(!paneCode || !dataId) {
			return;
		}
		var dataList = $scope.betData[paneCode] || [];
		dataList.push(dataId);
		$scope.betData[paneCode] = dataList;

		var oTm = dataIdMatchTm(dataId);
		//根据当前oTm 这个特码去 找到当前$scope.quickSxArray数组下的matchTm 把特码推进去，再判断 把当前生肖复选框 改为true
		for (var i = 0; i < $scope.quickSxArray.length; i++) {
			for (var j = 0; j < $scope.quickSxArray[i].numberNo.length; j++) {
				if($scope.quickSxArray[i].numberNo[j] == oTm){
					$scope.quickSxArray[i].matchTm.push(oTm);
					if($scope.quickSxArray[i].numberNo.length == $scope.quickSxArray[i].matchTm.length && $scope.quickSxArray[i].matchTm.length !== 0){
						$scope.quickSxArray[i].checked = true;
					}
				}
			}
		}
		calcCount();
	};

	/**
	 * 取消选中
	 */
	$scope.removeDataId = function(dataId) {
		var paneCode = $scope.currPane.code;
		if(!paneCode || !dataId) {
			return;
		}
		var dataList = $scope.betData[paneCode] || [];
		var index = dataList.indexOf(dataId);
		if(index > -1) {
			dataList.splice(index, 1);
		}
		$scope.betData[paneCode] = dataList;

		var oTm = dataIdMatchTm(dataId);
		//根据当前oTm 这个特码去 找到当前$scope.quickSxArray数组下的matchTm 从数组中删除，再判断 把当前生肖复选框 改为false
		for (var i = 0; i < $scope.quickSxArray.length; i++) {
			for (var j = 0; j < $scope.quickSxArray[i].matchTm.length; j++) {
				if($scope.quickSxArray[i].matchTm[j] == oTm){
					$scope.quickSxArray[i].matchTm.splice(j,1)
				}
				if($scope.quickSxArray[i].numberNo.length != $scope.quickSxArray[i].matchTm.length && $scope.quickSxArray[i].matchTm.length !== 0){
					$scope.quickSxArray[i].checked = false;
				}
			}
		}
		calcCount();
	};

	var dataIdMatchTm = function(dataId){
		var sidebar = $('.bet'); //获取下面 49 个特码
		var oTm; //记录当前选中的dataId 去找 到匹配的 特码
		for (var i = 0; i < sidebar.length; i++) {
			//根据当前选中的dataId 去找 到匹配的 特码 oTm 保存
			if(String(sidebar.eq(i).data('id')) == dataId){
				oTm = sidebar.eq(i).find('.bet-content .round-3').text();
			}
		}
		return oTm;
	}

	/**
	 * 计算注数
	 */
	var calcCount = function() {
		var betCount = 0;
		for(var code in $scope.betData) {
			if($scope.betData[code]) {
				betCount += $scope.betData[code].length;
			}
		}
		if(betCount==0){
			for (var i = 0; i < $scope.quickSxArray.length; i++) {
				$scope.quickSxArray[i].checked = false;
			}
		}
		$scope.shareData.betCount = betCount;
	};

	/**
	 * 保存特殊玩法选中的号码
	 */
	$scope.addNum = function(num) {
		var paneCode = $scope.currPane.code;

		var dataList = $scope.betData[paneCode] || [];
		if(dataList.indexOf(num) > -1) {
			return true;
		}

		if(dataList.length >= $scope.selectSub.max) {
			Tools.tip('不允许超过' + $scope.selectSub.max + '个选项');
			return false;
		}

		dataList.push(num);
		$scope.betData[paneCode] = dataList;
		calcSubCount();
		return true;
	};

	/**
	 * 移除特殊玩法选中号码
	 */
	$scope.removeNum = function(num) {
		var paneCode = $scope.currPane.code;
		var dataList = $scope.betData[paneCode] || [];
		var index = dataList.indexOf(num);
		if(index > -1) {
			dataList.splice(index, 1);
		}
		$scope.betData[paneCode] = dataList;
		calcSubCount();
		return true;
	};

	var getComs = function(min, len) {
		return choose(len, min);
	};

	/**
	 * 计算注数
	 */
	var calcSubCount = function() {
		var paneCode = $scope.currPane.code;
		var dataList = $scope.betData[paneCode] || [];

		// 合肖特殊处理
		if($scope.selectSub.type == 'HX') {
			if(dataList.length < $scope.selectSub.min) {
				$scope.shareData.odds = [];
				$scope.shareData.betCount = 0;
			}
			else {
				var startPlayId = parseInt($scope.selectSub.id);
				var playId = startPlayId + dataList.length;
				var play = Lottery.getPlay(playId);
				$scope.shareData.odds = [play.odds];
				$scope.shareData.betCount = 1;
			}
		}
		else {
			var coms = getComs($scope.selectSub.min, dataList.length);
			if(!coms) {
				$scope.shareData.betCount = 0;
				return;
			}

			$scope.betSubArray = [];
			for(var i=0; i<coms.length; i++) {
				var childs = coms[i];
				var nums = [];
				for(var j=0; j<childs.length; j++) {
					nums.push(dataList[childs[j]]);
				}
				$scope.betSubArray.push(nums);
			}

			$scope.shareData.betCount = $scope.betSubArray.length;
		}
	};

	$scope.getPlayIdArray = function() {
		var playIdArray = [];
		for(var key in $scope.betData) {
			var betData = $scope.betData[key] || [];
			playIdArray = playIdArray.concat(betData);
		}
		return playIdArray;
	};

	/**
	 * 重置下注区域
	 */
	$scope.reset = function() {
		$scope.betData = {};
		$rootScope.choosed = [];
		//$scope.shareData.odds = [];
		$scope.shareData.betCount = 0;
		$('.bet-view, .nn-area').find('.bet-choose').removeClass('bet-choose');
		for (var i = 0; i < $scope.quickSxArray.length; i++) {
			$scope.quickSxArray[i].checked = false;
			$scope.quickSxArray[i].matchTm.splice(0,$scope.quickSxArray[i].matchTm.length)
		}
		$scope.$broadcast('Lottery.Reset');
	};

	/**
	 * 选中第一个玩法子类型
	 */
	$scope.selectFirstSub = function($event) {
		var navItems = $('#sub-navs').find('.nav-item');
		if(navItems.length > 0) {
			subInit(angular.element(navItems[0]));
		}
	};

	/**
	 * 玩法子类选中
	 */
	$scope.selectSubnav = function(index, $event) {
		$scope.reset();
		$scope.shareData.subIndex = index;
		$ionicScrollDelegate.$getByHandle('sub-navs').scrollTo(45 * (index - 1) * 1.3, 0, true);
		if($event) {
			var element = angular.element($event.target);
			subInit(element);
		}
	};

	var subInit = function(element) {
		var dataId = element.attr('data-id');
		if(!dataId) {
			return;
		}

		$scope.shareData.odds = [];

		var ids = dataId.split('|');

		$scope.selectSub = {id: ids[0], min: element.attr('min-size'), max: element.attr('max-size'), text: element.html(), type: element.attr('play-type')};
		if(ids.length == 1) {
			var play = Lottery.getPlay(ids[0]);
			if(play) {
				if(($scope.currPane.code=='ZXBZ' || $scope.currPane.code=='HX') && $('.col.col-20.sub-bet.ok.bet-choose').length==0){
					return;
				}
				$scope.shareData.odds.push(play.odds);
			}
		}
		else {
			// 六合彩连码，三全中和二中特会出现2种赔率的情况
			for(var i=0; i<ids.length; i++) {
				var play = Lottery.getPlay(ids[i]);
				if(play) {
					$scope.shareData.odds.push(play.odds);
				}
			}
		}
	};

	var checkPlayMoney = function(play, betMoney, totalMoney) {
		var minMoney = play.minMoney;
		var maxMoney = play.maxMoney;
		var maxTurnMoney = play.maxTurnMoney;

		if (1==2 && betMoney < minMoney) {
			Tools.tip('最小投注金额为：' + minMoney);
			return false;
		}

		if (betMoney > maxMoney) {
			Tools.tip('最大投注金额为：' + maxMoney);
			return false;
		}

		if (totalMoney > maxTurnMoney) {
			Tools.tip('当前期设定的最大投注金额为：' + maxTurnMoney);
			return false;
		}

		return true;
	};
	var isInstant = '';
	var betParams = {};
	var betUrl = '';
	$scope.bet = function(params) {
		if($('.betsList').length == 0){
			var $confirmDialog = '<div class="betsList">'+
									'<div class="betsList_til"><h3>下注清单</h3></div>'+
									'<div class="betsList_cont"></div>'+
									'<div class="betsList_btn"><input class="betsList_btn_cancle" type="button" value="取消" ><input class="betsList_btn_yes" type="button" value="确定" ></div>'+
								'</div>';
			var $mask_pop = '<div class="mask_pop">&nbsp;</div>';
			$('.view').append($confirmDialog);
			$('.view').append($mask_pop);
		}
		if(!$scope.shareData.betMoney) {
			Tools.tip('请输入投注金额');
			return;
		}
		if(!$scope.shareData.betCount) {
			Tools.tip('请选择玩法');
			return;
		}

		if(parseFloat($scope.shareData.betMoney) != parseFloat($scope.shareData.betMoney)) {
			Tools.tip('投注金额不能为小数');
			$scope.shareData.betMoney = parseFloat($scope.shareData.betMoney);
			return;
		}
		var confirmHtml = '<ion-scroll direction="y">';
		var confirmHtml = '';
		var betCount = parseInt($scope.shareData.betCount);    //注数
		var betMoney = parseFloat($scope.shareData.betMoney);   //单注金额
		var totalMoney = 0;      //总金额
		betParams = {};
		isInstant = Number($scope.game.isInstant);
		if(!isInstant){
			var postcodeendtime = lt_timer2(nextIssueData.endtime);
			betParams["ftime"] = postcodeendtime;
		}

		//表示跟注投注
		if(params.isFollowUp){
			betParams.isFollowUp = params.isFollowUp;
			betParams["gameId"] = params.betParams.gameId;
			betParams["turnNum"] = params.betParams.turnNum;
			// 是否为特殊玩法
			if(params.betParams.selectSub){
				$scope.selectSub = params.betParams.selectSub;
			}else{
				$scope.selectSub = '';
			}
			totalMoney = 0;
		}else{
			betParams["gameId"] = $scope.gameId;
			betParams["turnNum"] = $scope.shareData.curIssue;
			totalMoney = betCount * betMoney;
			betParams["totalNums"] = betCount;
			betParams["totalMoney"] = totalMoney;
		}
		var maxOdds = '';
		betParams["totalNums"] = betCount;
		betParams["betSrc"] = 0;
		betParams.singleAmount = $scope.shareData.betMoney;
		var playNameArray = [];   //玩法名称
		// 特殊玩法
		if($scope.selectSub) {
			// console.log("特殊玩法");
			betParams.specialPlay = true;   //特殊玩法
			betParams.selectSub = $scope.selectSub;
			if($scope.selectSub.type == 'LXLW') {
				// console.log("LXLW");
				betParams.playType = "LXLW";  //特殊玩法类型
				var betSubArray = $scope.betSubArray;
				betParams.betSubArray = betSubArray;
				// console.log(params, 'params');
				if(params.isFollowUp){
					for(var i in params.betParams.betSubArray) {
						var playIdArray = params.betParams.betSubArray[i];
						var odds = 0;
						var betInfo = [];
						var playIds = [];
						var playId = 0; // 赔率最小的ID
						for(var j in playIdArray) {
							var play = Lottery.getPlay(playIdArray[j]);
							if(odds == 0) {
								odds = play.odds;
								playId = play.id;
							}
							else if(play.odds < odds) {
								odds = play.odds;
								playId = play.id;
							}
							betInfo.push(play.alias);
							playIds.push(play.id);
						}
						betParams["betBean[" + i + "][playId]"] = params.betParams["betBean["+i+"][playId]"];
						betParams["betBean[" + i + "][money]"] = params.betParams["betBean["+i+"][money]"];
						betParams["betBean[" + i + "][betInfo]"] = params.betParams["betBean["+i+"][betInfo]"];
						betParams["betBean[" + i + "][playIds]"] = params.betParams["betBean["+i+"][playIds]"];
						confirmHtml += '<div><span class="changeBatName">【' + params.betParams.selectSub.text + params.betParams["betBean["+i+"][betInfo]"] + '】 @' + odds + ' x </span><input class="changeBetMoney" maxlength="10"  type="number" value=' + params.betParams["betBean["+i+"][money]"] + ' ></div>';
						totalMoney += params.betParams["betBean["+i+"][money]"];
					}
					betParams["totalMoney"] = totalMoney;
					confirmHtml += '<div class="split-line"></div>';
					confirmHtml += '<div>【合计】组数：<span class="t-blue" style="margin-right:15px">' + betCount + '</span>总金额：<span class="t-blue batTotalMoney">' + totalMoney + '</span></div>';
				}else{
					for(var i in betSubArray) {
						var playIdArray = betSubArray[i];
						var odds = 0;
						var betInfo = [];
						var playIds = [];
						var playId = 0; // 赔率最小的ID
						for(var j in playIdArray) {
							var play = Lottery.getPlay(playIdArray[j]);
							if(odds == 0) {
								odds = play.odds;
								playId = play.id;
							}
							else if(play.odds < odds) {
								odds = play.odds;
								playId = play.id;
							}
							betInfo.push(play.alias);
							playIds.push(play.id);
						}
						playNameArray.push({
							playName1: $scope.selectSub.text,
							playName2: betInfo.join(',')
						});
						betParams["betBean[" + i + "][playId]"] = playId;
						betParams["betBean[" + i + "][money]"] = betMoney;
						betParams["betBean[" + i + "][betInfo]"] = betInfo.join(',');
						betParams["betBean[" + i + "][playIds]"] = playIds.join(',');
						confirmHtml += '<div><span class="changeBatName">【' + $scope.selectSub.text + ' ' + betInfo.join(',') + '】 @' + odds + ' x </span><input class="changeBetMoney" maxlength="10"  type="number" value=' + betMoney + ' ></div>';
					}
					betParams["totalMoney"] = totalMoney;
					confirmHtml += '<div class="split-line"></div>';
					confirmHtml += '<div>【合计】组数：<span class="t-blue" style="margin-right:15px">' + betCount + '</span>总金额：<span class="t-blue batTotalMoney">' + totalMoney + '</span></div>';
				}
			}else if($scope.selectSub.type == 'ZX') {
				var n = 0;
				var zx = 213710;
				var playId = $scope.selectSub.id;
				var isqszx = $scope.shareData.subIndex == '2';
				var zx_1 = [],zx_2 = [],zx_3 = [];
				var betSubArray = $scope.betSubArray;
				for(var i in betSubArray) {
					var each = betSubArray[i][0]-zx;
					if(each<12){
						zx_1.push(each);
					}else if(each<32){
						zx_2.push(each-20);
					}else{
						zx_3.push(each-40);
					}
				}

				if(zx_1.length==0 || zx_2.length==0 || zx_3.length==0 && isqszx){
					Tools.tip('下注内容不正确，请重新下注');
					return false;
				}

				for(var i in zx_1){
					for(var j in zx_2){
						for(var k=0;k<Math.max(1,zx_3.length);k++){
							var betInfo = zx_1[i]+','+zx_2[j];
							if(isqszx) betInfo = betInfo + ',' + zx_3[k];
							betParams["betBean[" + n + "][playId]"] = playId;
							betParams["betBean[" + n + "][money]"] = betMoney;
							betParams["betBean[" + n + "][betInfo]"] = betInfo;
							betParams["betBean[" + n + "][playIds]"] = '';
							confirmHtml += '<div><span class="changeBatName">【' + $scope.selectSub.text + ' ' + betInfo + '】 @' + $scope.shareData.odds + ' x </span><input class="changeBetMoney" maxlength="10"  type="number" value=' + betMoney + ' ></div>';
							n++;
						}
					}
				}

				var betCount = n;
				var totalMoney = betCount * betMoney;
				betParams["totalNums"] = betCount;
				betParams["totalMoney"] = totalMoney;
				confirmHtml += '<div class="split-line"></div>';
				confirmHtml += '<div>【合计】组数：<span class="t-blue" style="margin-right:15px">' + betCount + '</span>总金额：<span class="t-blue batTotalMoney">' + totalMoney + '</span></div>';

			}
			else if($scope.selectSub.type == 'HX') {
				// console.log("HX");
				betParams.playType = "HX";
				var paneCode;
				if(params.isFollowUp){
					paneCode = params.betParams.paneCode;
				}else{
					paneCode = $scope.currPane.code;
				}
				var dataList = $scope.betData[paneCode] || [];
				if(dataList.length == 0) {
					Tools.tip('下注内容为空');
					return;
				}

				var playId = '';

				var hxList = {
					playId: playId,
					betMoney: betMoney,
					totalMoney: totalMoney
				};
				betParams.hxArray = hxList;

				var betInfo = '';

				if(params.isFollowUp){
					betInfo = params.betParams["betBean[0][betInfo]"];
					playId = params.betParams["betBean[0][playId]"];
					betMoney = params.betParams.hxArray.betMoney;
					totalMoney = params.betParams.hxArray.totalMoney;
				}else{
					betInfo = dataList.join(',');
					playId = parseInt($scope.selectSub.id) + dataList.length;
				}

				var play = Lottery.getPlay(playId);
				var playCate = Lottery.getPlayCate(play.playCateId);


				if(!checkPlayMoney(play, betMoney, totalMoney)) {
					return;
				}

				betParams["betBean[0][playId]"] = playId;
				betParams["betBean[0][odds]"] = play.odds;
				betParams["betBean[0][rebate]"] = play.rebate;
				betParams["betBean[0][money]"] = betMoney;
				betParams["betBean[0][betInfo]"] = betInfo;
				confirmHtml += '<div>' + playCate.name + ' - ' + play.name + '【' + betInfo + '】</div><div>组合数：' + betCount + '</div><div><span class="changeBatName">单注金额：</span><input maxlength="10"  class="changeBetMoney" type="number" value=' + betMoney + '></div><div>总金额：<span class="batTotalMoney">' + totalMoney + '</span></div>';

				playNameArray.push({
					playName1: playCate.name,
					playName2: play.name,
					playName3: betInfo
				});

				betParams["totalMoney"] = totalMoney;

			}
			else {
				// console.log("其他");
				var playId = $scope.selectSub.id;
				var play = Lottery.getPlay(playId);

				if(!checkPlayMoney(play, betMoney, totalMoney)) {
					return;
				}

				var paneCode = $scope.currPane.code;
				var dataList = $scope.betData[paneCode] || [];
				var betInfo = '';

				if(params.isFollowUp){
					betInfo = params.betParams["betBean[0][betInfo]"];
					betParams["betBean[0][playId]"] = params.betParams["betBean[0][playId]"];
					betParams["betBean[0][odds]"] = params.betParams["betBean[0][odds]"];
					betParams["betBean[0][rebate]"] = params.betParams["betBean[0][rebate]"];
					betParams["betBean[0][money]"] = params.betParams["betBean[0][money]"];
					betParams["betBean[0][betInfo]"] = params.betParams["betBean[0][betInfo]"];
					totalMoney = params.betParams.totalMoney;
					confirmHtml += '<div>' + play.name + '【' + betInfo + '】</div><div>组合数：' + betCount + '</div><div><span class="changeBatName">单注金额：</span><input class="changeBetMoney" maxlength="10"  type="number" value=' + params.betParams["betBean[0][money]"] + '></div><div>总金额：<span class="batTotalMoney">' + totalMoney + '</span></div>';
				}else{
					betInfo = dataList.join(',');
					betParams["betBean[0][playId]"] = playId;
					betParams["betBean[0][odds]"] = play.odds;
					betParams["betBean[0][rebate]"] = play.rebate;
					betParams["betBean[0][money]"] = betMoney;
					betParams["betBean[0][betInfo]"] = betInfo;
					confirmHtml += '<div>' + play.name + '【' + betInfo + '】</div><div>组合数：' + betCount + '</div><div><span class="changeBatName">单注金额：</span><input class="changeBetMoney" maxlength="10"  type="number" value=' + betMoney + '></div><div>总金额：<span class="batTotalMoney">' + totalMoney + '</span></div>';
				}
				playNameArray.push({
					playName1: play.name,
					playName2: betInfo
				});
				betParams["totalMoney"] = totalMoney;
			}
		}
		else {
			// console.log("正常玩法");

			betParams.specialPlay = false;
			var playIdArray = $scope.getPlayIdArray();
			var dataList = $scope.betData[paneCode] || [];
			var index = 0;

			for(var i=0; i<playIdArray.length; i++) {
				var playId = playIdArray[i];
				var play = Lottery.getPlay(playId);
				if(!play) {
					continue;
				}
				var minMoney = play.minMoney;
				var maxMoney = play.maxMoney;

				if(!checkPlayMoney(play, betMoney, totalMoney)) {
					return;
				}
				if($scope.gameId == 3 || $scope.game.from_type == 3){
					maxOdds = play.odds * 10;
				}

				if(params.isFollowUp){
					betParams["betBean[" + index + "][playId]"] = params.betParams["betBean["+index+"][playId]"];
					betParams["betBean[" + index + "][odds]"] = params.betParams["betBean["+index+"][odds]"];
					betParams["betBean[" + index + "][rebate]"] = params.betParams["betBean["+index+"][rebate]"];
					betParams["betBean[" + index + "][money]"] = params.betParams["betBean["+index+"][money]"];
					confirmHtml += '<div><span class="changeBatName">【' + $filter('playCate')(play) + play.name + '】 @' + play.odds + (maxOdds?(' ~ @'+maxOdds):'') + '   x </span><input maxlength="10" class="changeBetMoney" type="number" value=' + params.betParams["betBean["+index+"][money]"] + ' ></div>';
					totalMoney += params.betParams["betBean["+index+"][money]"];
				}else{
					betParams["betBean[" + index + "][playId]"] = playId;
					betParams["betBean[" + index + "][odds]"] = play.odds;
					betParams["betBean[" + index + "][rebate]"] = play.rebate;
					betParams["betBean[" + index + "][money]"] = betMoney;
					confirmHtml += '<div><span class="changeBatName">【' + $filter('playCate')(play) + play.name + '】 @' + play.odds + (maxOdds?(' ~ @'+maxOdds):'') + '   x </span><input maxlength="10" class="changeBetMoney" type="number" value=' + betMoney + ' ></div>';
				}

				playNameArray.push({
					playName1: $filter('playCate')(play),
					playName2: play.name
				});
				index++;
			}
			totalMoney = totalMoney.toFixed(2);
			betParams["totalMoney"] = totalMoney;
			confirmHtml += '<div class="split-line"></div>';
			confirmHtml += '<div>【合计】总注数：<span class="t-blue" style="margin-right:15px">' + betCount + '</span>总金额：<span class="t-blue batTotalMoney">' + totalMoney + '</span></div>';
		}
		betParams.paneCode = $scope.currPane.code;   //获取二级分类

		betParams.playNameArray = playNameArray;

		confirmHtml += '</ion-scroll>';
		//修改投注金额
		$(".betsList_cont").empty().append(confirmHtml);
		$scope.showBetList();
		$(".changeBetMoney").on('keyup',function(){
			if($(this).val().length > 9){
				var tVal = $(this).val().slice(0,9);
				$(this).val(tVal);
			}
			var thisVal = $(this).val().replace(/^(\-)*(\d+)\.(\d\d).*$/,'$1$2.$3');
			$(this).val(thisVal);
			if($(this).val() < 0){
				$(this).val('');
			}
			if($(this).val().indexOf(".") == 0){
				var tVal = $(this).val().slice(0,3);
				$(this).val(tVal);
			}
			//判断为非数字
			var isNotNum = isNaN($(this).val());
			if(isNotNum){
				$(this).val('');
			}

			var thisIndx = $("input.changeBetMoney").index(this);
			betParams["betBean[" + thisIndx + "][money]"] = $(this).val()*1;

			var changeMoneyList = $(document).find('.changeBetMoney');
			var totalMoney = 0;
			for (var index = 0; index < changeMoneyList.length; index++) {
				var element = $(changeMoneyList[index]).val();
				totalMoney = $scope.numAdd(totalMoney, element);
			}
			betParams.totalMoney = totalMoney;
			$(".batTotalMoney").text(totalMoney);
		});

		$(".changeBetMoney").on('afterpaste',function(){
			if($(this).val().length > 9){
				var tVal = $(this).val().slice(0,9);
				$(this).val(tVal);
			}
			var thisVal = $(this).val().replace(/^(\-)*(\d+)\.(\d\d).*$/,'$1$2.$3');
			$(this).val(thisVal);
			if($(this).val() < 0){
				$(this).val('');
			}
			if($(this).val().indexOf(".") == 0){
				var tVal = $(this).val().slice(0,3);
				$(this).val(tVal);
			}
			//判断为非数字
			var isNotNum = isNaN($(this).val());
			if(isNotNum){
				$(this).val('');
			}

			var thisIndx = $("input.changeBetMoney").index(this);
			betParams["betBean[" + thisIndx + "][money]"] = $(this).val()*1;

			var changeMoneyList = $(document).find('.changeBetMoney');
			var totalMoney = 0;
			for (var index = 0; index < changeMoneyList.length; index++) {
				var element = $(changeMoneyList[index]).val();
				totalMoney = $scope.numAdd(totalMoney, element);
			}
			betParams.totalMoney = totalMoney;
			$(".batTotalMoney").text(totalMoney);
		});

		$scope.tempMmcConfirm = betParams;
		$(".betsList_btn_yes").unbind();
		// 下注
		$(".betsList_btn_yes").on('click',function (params) {
			$(".betsList").hide();
			$(".mask_pop").hide();
			betUrl = '';
			if(!isInstant){
				betUrl = '/mobile/Data/postCode?t=' + Date.parse(new Date());
			}else {
				betUrl = '/Data/instantPost?t=' + Date.parse(new Date());
				$scope.isOpenMmc = true;
				$('.mmcauto').show();
			}
			$scope.betConfirm(betParams)
		});

		$scope.hideBetList();

	};
	$scope.showBetList = function() {
		$(".betsList").show();
		$(".mask_pop").show();
	};
	// 取消下注
	$scope.hideBetList = function() {
		$(".betsList_btn_cancle").click(function(){
			$(".betsList").hide();
			$(".mask_pop").hide();

			$scope.reset();
		    My.refreshMoney(false, '', true);
		});
	};
	$scope.hideBetList();

	//避免相加精度损失
	$scope.numAdd = function(num1, num2) {
		var baseNum, baseNum1, baseNum2;
		try {
			baseNum1 = num1.toString().split(".")[1].length;
		} catch (e) {
			baseNum1 = 0;
		}
		try {
			baseNum2 = num2.toString().split(".")[1].length;
		} catch (e) {
			baseNum2 = 0;
		}
		baseNum = Math.pow(10, Math.max(baseNum1, baseNum2));
		return (num1 * baseNum + num2 * baseNum) / baseNum;
	};


	$scope.mmcauto = false;
	$scope.mmcInterval = null;
	$scope.isOpenMmc = true;
	// 自动投注
	$('.mmcauto').click(function () {
		$scope.mmcauto = false;
		clearInterval($scope.mmcInterval);
		if($scope.mmcauto || $('.mmcOpenNum0').hasClass('rowup')){
			Tools.tip('请等待游戏结束');
			return;
		}
		$(this).hide();
		$('.mmczt').show();
		$scope.mmcauto = true;

		// 执行间隙
		setTimeout(function(){
			$(".five_s").show();
			$(".five_s").text("倒计时：3秒");
			var five_s = 2;
			var intervalid;
			intervalid = setInterval(countDownFun, 1000);
			function countDownFun() {
				$(".five_s").text("倒计时："+five_s+"秒");
				if (five_s == 0) {
					$scope.betConfirm($scope.tempMmcConfirm);
					clearInterval(intervalid);
					$(".five_s").hide();
				}
				five_s--;
			}
		},100);

		//自动开彩
		$scope.mmcInterval = setInterval(function (params) {
			$(".five_s").show();
			$(".five_s").text("倒计时：3秒");
			var five_s = 2;
			var intervalid;
			intervalid = setInterval(countDownFun, 1000);
			function countDownFun() {
				$(".five_s").text("倒计时："+five_s+"秒");
				if (five_s == 0) {
					$scope.betConfirm($scope.tempMmcConfirm);
					clearInterval(intervalid);
					$(".five_s").hide();
				}
				five_s--;
			}
		},5000);

	});

	$('.closeMmc').click(function (params) {
		if($('.mmcOpenNum0').hasClass('rowup')){
			Tools.tip('请等待游戏结束');
			return;
		}
		$('.mmcopenbox').hide();
		$('.mmczt').hide();
		$scope.isOpenMmc = false;
		clearInterval($scope.mmcInterval);
	});
	$('.mmczt').click(function (params) {
		$scope.mmcauto = false;
		clearInterval($scope.mmcInterval);
		$('.mmczt').hide();
		$('.mmcauto').show();
	});

	$(".mmczt").hide();

	//开彩
	$scope.betConfirm = function (betParams) {
		Tools.ajax({
			url: betUrl,
			params: betParams,
			backdrop: true,
			dataType: "json",
			success: function(g) {
				if(!isInstant || !g.openNum){
					//判定是否投注成功，是否为跟注投注，是否有聊天室并开启，用户是否为游客
					if(CONFIG_MAP.isChatFollow && g.success && !betParams.isFollowUp && $scope.chat && $scope.chat.flag && My.info.username != "游客" && parseFloat(betParams.totalMoney) >= parseFloat(CONFIG_MAP.minFollowAmount)){
						$scope.shareDialog = $ionicPopup.show({
							title:'温馨提示<b class="closePopup"></b>',
							template: '<div style="padding-bottom:20px; text-align: center">下注成功！</div>',
							cssClass: 'popupTrans',
							buttons: [
								{
									text: '确定',
									onTap:function () {
										$scope.shareDialog.close();
									}
								},
								{
									type: 'button-positive',
									text: '分享下注',
									onTap: function(e) {
										betParams.betFollowFlag = true;
										var thisGame = Lottery.getGame(betParams.gameId);
										$scope.initChatRoom();
										$scope.kjLotteryChat('chat');  //切换到聊天界面

										var betInfoText = '';
										//特殊玩法
										if(betParams.specialPlay){
											if(betParams.playType == 'LXLW'){
												for (var index = 0; index < betParams.totalNums; index++) {
													var thisName = (betParams.playNameArray)[index];
													var playMoney = betParams["betBean["+index+"][money]"];
													betInfoText += ('\n'+thisName.playName1+'　'+thisName.playName2+'　金额：￥'+playMoney);
												}
											}else if(betParams.playType == 'HX'){
												var thisName = (betParams.playNameArray)[0];
												var playMoney = betParams["betBean[0][money]"];
												betInfoText = thisName.playName1 +' - '+ thisName.playName2 + '【'+thisName.playName3+'】金额：￥'+playMoney;
											}else{
												var thisName = (betParams.playNameArray)[0];
												var playMoney = betParams["betBean[0][money]"];
												betInfoText = thisName.playName1 + '【'+thisName.playName2+'】金额：￥'+playMoney;
											}
										//正常玩法
										}else{
											for (var index = 0; index < betParams.totalNums; index++) {
												var thisName = (betParams.playNameArray)[index];
												var playMoney = betParams["betBean["+index+"][money]"];
												betInfoText += ('\n'+thisName.playName1+thisName.playName2+'　金额：￥'+playMoney);
											}
										}
										betParams.playNameArray = "";   //清空玩法名称

										var playSubType = '\n玩法：'+ $scope.currPane.name;

										// 发送消息
										setTimeout(function(){
											var labelCont = '';
											if(thisGame.name == '香港六合彩'){
												labelCont = '游戏：'+thisGame.name+'\n期号：'+betParams.turnNum+playSubType+'\n内容：'+betInfoText+'\n共计：'+betParams.totalNums+'注';
											}else{
												labelCont = '游戏：'+thisGame.name+'\n期号：'+betParams.turnNum+'\n内容：'+betInfoText+'\n共计：'+betParams.totalNums+'注';
											}

											$scope.chat.sendMessage(true, labelCont, betParams);
											Tools.tip("分享成功");
											$scope.reset();
											My.refreshMoney(false, '', true);

										}, 1000);
										$scope.shareDialog.close();
									}
								}
							]
						});
					}else{
						Tools.tip(g.msg);
					}
				}else {
					if($scope.isOpenMmc){
						$('.mmcopenbox').show();                     //显示弹窗
						$scope.startMmc(g.openNum.split(','),g);     //开彩提示内容判定
					}
				}
				//Tools.tip('下注成功');
				$scope.reset();
				//My.addMoney(-totalMoney);
				My.refreshMoney(false, '', true);
				if (g.redirect){
					window.location.href=g.redirect;
				}
			}
		});
	}

	$('body').on('click','.closePopup',function () {
		if($scope.shareDialog){
			$scope.shareDialog.close();
		}
	});

	$scope.htmlspecialchars = function(str) {
		str = str.replace(/\"/g,"'")
		return str;
	}

	$scope.columnNum = 5;
	$scope.initBaseNum = 40;
	$scope.isMmcInit = true;
	var tempResultArray = {
		l1:[],
		l2:[],
		l3:[],
		l4:[],
		l5:[],
	};


	$scope.playTime = 0;
	$scope.initMmc = function (result) {
		if($scope.isMmcInit){
			$('.mmczt').hide();
			for(var i=0;i< $scope.columnNum;i++){
				$scope['$column' + i] = '<ul class="mmcOpenNum' + i + '"></ul>';
				$('.mmcNumContainer').append($scope['$column' + i]);
			}
			var tempResult = [Math.floor(Math.random()*10),Math.floor(Math.random()*10),Math.floor(Math.random()*10),Math.floor(Math.random()*10),Math.floor(Math.random()*10)];
			for(var i=0;i<tempResult.length;i++){
				for(var j=0;j<$scope.initBaseNum;j++){
					var n = Math.floor(Math.random()*10);
					tempResultArray['l'+(i+1)].unshift(n);
				}
			}

		for (var i = 0; i < $scope.columnNum; i++) {
			for (var k = 0; k < $scope.initBaseNum; k++) {
				$('.mmcOpenNum' + i).append('<li class="mmcItem playTime' + $scope.playTime + '">'+tempResultArray['l'+(i+1)][k]+'</li>');
			}
		}

		var cardItemHeight = window.getComputedStyle(document.querySelector(".mmcItem")).height;
		var cardItemHeightNum = parseFloat((cardItemHeight.split("px"))[0]);

		$scope.addCSS('@keyframes rowup' +
            '{' +
            '0% {' +
            '-webkit-transform: translate3d(0, 0, 0);' +
            'transform: translate3d(0, 0, 0);' +
            '}' +

            '100% {' +
            '-webkit-transform: translate3d(0,-' + cardItemHeightNum * $scope.initBaseNum + 'px' + ' , 0);' +
            'transform: translate3d(0,-' + cardItemHeightNum * $scope.initBaseNum + 'px' + ', 0);' +
            '}' +
            '}' +

            '@-moz-keyframes rowup' + /* Firefox */
            '{' +
            '0% {' +
            '-webkit-transform: translate3d(0, 0, 0);' +
            'transform: translate3d(0, 0, 0);' +
            '}' +

            '100% {' +
            '-webkit-transform: translate3d(0,-' + cardItemHeightNum * $scope.initBaseNum + 'px' + ' , 0);' +
            'transform: translate3d(0,-' + cardItemHeightNum * $scope.initBaseNum + 'px' + ', 0);' +
            '}' +
            '}' +

            '@-webkit-keyframes rowup' + /* Safari and Chrome */
            '{' +
            '0% {' +
            '-webkit-transform: translate3d(0, 0, 0);' +
            'transform: translate3d(0, 0, 0);' +
            '}' +

            '100% {' +
            '-webkit-transform: translate3d(0,-' + cardItemHeightNum * $scope.initBaseNum + 'px' + ' , 0);' +
            'transform: translate3d(0,-' + cardItemHeightNum * $scope.initBaseNum + 'px' + ', 0);' +
            '}' +
            '}' +

            '@-o-keyframes rowup' + /* Opera */
            '{' +
            '0% {' +
            '-webkit-transform: translate3d(0, 0, 0);' +
            'transform: translate3d(0, 0, 0);' +
            '}' +

            '100% {' +
            '-webkit-transform: translate3d(0,-' + cardItemHeightNum * $scope.initBaseNum + 'px' + ' , 0);' +
            'transform: translate3d(0,-' + cardItemHeightNum * $scope.initBaseNum + 'px' + ', 0);' +
            '}' +
			'}');

			$scope.isMmcInit = false;
		}
		$scope.playTime++;

		for(var i=0;i<result.length;i++){
			tempResultArray['l'+(i+1)].push(result[i]);
			for(var j=0;j<($scope.initBaseNum-1);j++){
				var n = Math.floor(Math.random()*10);
				tempResultArray['l'+(i+1)].push(n);
			}
		}
		if(tempResultArray['l1'].length > 80){
			for(var i=0;i<5;i++){
				tempResultArray['l'+(i+1)].splice(0,40);
			}
		}

		for (var i = 0; i < $scope.columnNum; i++) {
			for (var k = 40; k < 80; k++) {
				$('.mmcOpenNum' + i).append('<li class="mmcItem playTime' + $scope.playTime + '">'+tempResultArray['l'+(i+1)][k]+'</li>');
			}

		}
	}

	//展示开彩效果
	$scope.mmcEffect = function (result,g) {
		var mmcColor,mmcSx;
		if($scope.gameId == 11){
			mmcColor = g.color.split(',');
			mmcSx = g.sx.split(',');
			$(".mmcNumContainer").empty().append("<ul class='mmc_num_list mmc_lhc'></ul>");
		}else {
			$(".mmcNumContainer").empty().append("<ul class='mmc_num_list'></ul>");
		}
		if(result.length == 5){
			$(".mmc_num_list").css("margin-left", "3.1rem");
		}else{
			$(".mmc_num_list").css("margin-left", "0rem");
		}

		for (var index = 0; index < result.length; index++) {
			var element = result[index];
			if($scope.gameId == 11){
				if(index == result.length -1){
					$(".mmc_num_list").append("<li>+</li><li class='round-4 "+mmcColor[index]+"' id=mmcq"+ (index+1) +">" + element + "<span>"+mmcSx[index]+"</span></li>");
				}else {
					$(".mmc_num_list").append("<li class='round-4 "+mmcColor[index]+"' id=mmcq"+ (index+1) +">" + element + "<span>"+mmcSx[index]+"</span></li>");
				}
			}else {
				$(".mmc_num_list").append("<li id=mmcq"+ (index+1) +">" + element + "</li>");
			}
		}
		var options = {
		  useEasing : true,
		  useGrouping : true,
		  separator : ',',
		  decimal : '.',
		  prefix : '',
		  suffix : ''
		};
		// var demo1 = new CountUp("mmcq1", 0, result[0], 0, 1, options);
		// var demo2 = new CountUp("mmcq2", 0, result[1], 0, 2.5, options);
		// var demo3 = new CountUp("mmcq3", 0, result[2], 0, 2.5, options);
		// var demo4 = new CountUp("mmcq4", 0, result[3], 0, 2.5, options);
		// var demo5 = new CountUp("mmcq5", 0, result[4], 0, 2.5, options);
		// var demo6 = new CountUp("mmcq6", 0, result[5], 0, 2.5, options);
		// var demo7 = new CountUp("mmcq7", 0, result[6], 0, 2.5, options);
		// var demo8 = new CountUp("mmcq8", 0, result[7], 0, 2.5, options);
		// var demo9 = new CountUp("mmcq9", 0, result[8], 0, 2.5, options);
		// var demo10 = new CountUp("mmcq10", 0, result[9], 0, 2.5, options);

		// demo1.start();
		// demo2.start();
		// demo3.start();
		// demo4.start();
		// demo5.start();
		// demo6.start();
		// demo7.start();
		// demo8.start();
		// demo9.start();
		// demo10.start();

	}

	//开彩提示语句
	$scope.startMmc = function (result,g) {
		$scope.mmcauto = true;
		$('.mmcstate').hide();
		$('.mmckjz').hide();
		$('.mmcykj').hide();
		// $scope.initMmc(result);   //动画效果

		$scope.mmcEffect(result,g);

		var _loop = function(i) {
			setTimeout(function() {
				$('.mmcOpenNum' + i).addClass('rowup');
			}, i * 250);

			setTimeout(function(){
				$('.playTime' + ($scope.playTime-0-1)).remove();
				$('.mmcOpenNum' + i).removeClass('rowup');
				$('.mmckjz').hide();
				$('.mmcykj').show();
				if(g.bonus>0){
					$('.mmczjl').show();
					$('.mmcykj').html('+'+g.bonus)
				}else {
					$('.mmcwzj').show();
					$('.mmcykj').html('再接再厉')
				}
			}, 50);
		};
		for (var i = 0; i < $scope.columnNum; i++) {
			_loop(i);
		}
	}

	$scope.addCSS = function(cssText) {
        var style = document.createElement('style'),
            head = document.head || document.getElementsByTagName('head')[0]; //获取head元素
        style.type = 'text/css';
        if (style.styleSheet) { //IE
            var func = function() {
                try { //防止IE中stylesheet数量超过限制而发生错误
                    style.styleSheet.cssText = cssText;
                } catch (e) {

                }
            }
            if (style.styleSheet.disabled) {
                setTimeout(func, 10);
            } else {
                func();
            }
        } else {
            var textNode = document.createTextNode(cssText);
            style.appendChild(textNode);
        }
        head.appendChild(style);
    }



	//路珠长龙
	$scope.queryData = {};
	$scope.bjl0 = false;
	$scope.contontLH = 0;
	$scope.contontRH = 0;
	$scope.queryData.gameId = parseInt($stateParams.gameId || Lottery.getFirstGameId());
	if($scope.queryData.gameId==10 || $scope.queryData.gameId==70){
		console.log('无此类游戏路珠');
		//$scope.queryData.gameId=Lottery.getFirstGameId();
	}
	// PC 手机 触摸转换
	if("ontouchstart" in window){
		startEvt = "touchstart";
		touchmove = "touchmove";
		endEvt = "touchend";
	}else{
		startEvt = "mousedown";
		touchmove = "mousemove";
		endEvt = "mouseup";
	}

	//获取数据
	$scope.loadData = function() {
		var url = "/mobile" + Tools.staticPath() + 'data/stat_lzclgame.js?gameId=' + $scope.queryData.gameId + '&_' + Math.random();
		var url2 = "/mobile" + Tools.staticPath() + 'data/stat.js?gameId=' + $scope.queryData.gameId + '&_' + Math.random();
		Tools.lazyLoad([url,url2], function() {
			$log.debug('luZhuCurData success');
			if(luZhuData){
				$scope.luZhuCurData=luZhuData;
				$scope.curStatList = curStatList;
				$scope.loadData1();
				if(!$rootScope.hideChanglong){
					$rootScope.initContentLuzhuH();
				}
				window.onmousewheel = document.onmousewheel=bodyScroll; //滚轮事件
				document.addEventListener(touchmove, bodyScroll, false); //触摸事件
			}
		});
	};

	//路珠、长龙主体加载
	$scope.reLoadCfg = function(){
		//取消滑动事件
		window.onmousewheel = document.onmousewheel=null;
		document.removeEventListener(touchmove, bodyScroll, false);
		$scope.luZhuCfgs = Lottery.getLuZhuCfg($scope.queryData.gameId);
		if($scope.luZhuCfgs){
			$rootScope.hideChanglong = false;
			$scope.luZhuRow1 = $scope.luZhuCfgs["row1"];
			$scope.curCode1 = $scope.luZhuRow1[0].code;
			$scope.loadData();
		}
	}


	$scope.loadData1 = function(code){
		var number = 0;
		if(code) $scope.curCode1 = code;
		$scope.htmlData=dataReverse($scope.luZhuCurData[$scope.curCode1]);
		if(!code && $scope.htmlData) {
			if($scope.htmlData[0][0].length>2){
				number = 1;
				$scope.bjl0 = true;
				$('#bjl_btn0').hide();
			}
			$scope.check_bjl_data(number,false);
		}

	}

	//静态6格
	function maxY(){
		$scope.maxY = 6;
		//for(var i=0;i<20;i++){
		//	$scope.maxY = $scope.htmlData[i].length>$scope.maxY?$scope.htmlData[i].length:$scope.maxY;
		//}
	}

	//初始化路珠长龙
	$scope.initTable = function(tableY){
		var text = "<div id='bjl_luzhu_btn' class='bjl_btn2 bjl_checked_btn' onclick='display_bjl(0);'>路珠</div>";
		text += "<div id='bjl_changlong_btn' class='bjl_btn2' onclick='display_bjl(1);'>长龙</div>";
		text += "<div id='bjl_hidden_btn' ng-click='hideContentH();'>隐藏</div><div id='bjl_con_wrap'><div id='bjl_lz_wrap' style=''>";
		for(var i=0;i<$scope.luZhuRow1.length;i++){
				text += "<button id='bjl_btn" + i + "' class='bjl_btn btnChangeTab'  ng-click='check_bjl_data("+i+");'>" + $scope.luZhuRow1[i].name + "</button>"
		}
		var table_str = '<div id="bjl_wrapper"><ion-scroll delegate-handle="luzhuCont" direction="x" scrollbar-x="false"><div id="bjl_scroller"><table id="table_data">';
		for(var i=1;i<=$scope.maxY;i++){
			table_str += '<tr>';
			for(var j=1;j<=tableY;j++){
				table_str += '<td><span id="bjl_' + j + '_' + i + '" ><i></i></span></td>';
			}
			 table_str += '</tr>';
		}
		table_str += '</table></div></div></div><div id="bjl_cl_wrap" style=""><div id="bjl_cl_wrapper"><div id="bjl_cl_scroller"><table><tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>';
		for(var i=0;i<$scope.curStatList.length;i++){
			table_str += '<tr><td class="black">'+$scope.curStatList[i].playCateName+'</td><td class="black">'+$scope.curStatList[i].playName+'</td><td class="blue">'+$scope.curStatList[i].count+'期</td></tr>';
		}
		table_str += '</tbody></table></div></div></ion-scroll></div></div>'
		text += table_str;
		var $html = $compile(text)($scope);
		$("#bjl_wrap").html($html);
		$("#bjl_wrap").css('bottom',$(".lotter-view .bar-footer").height());
		$ionicScrollDelegate.$getByHandle('luzhuCont').scrollBottom();
	}
	$scope.maxY = 6;
	$scope.initLeftH = 0;

	//还原滚动 初始化投注
	$scope.hideContentH = function(){
		 $ionicScrollDelegate.$getByHandle('showBottom').scrollTop()
		 $rootScope.hideChanglong = true;
		 $('#bjl_wrap').hide();
		 $(".bet-view.scroll-content.ionic-scroll .scroll").height($scope.contontRH);
		 $(".lottery-menu.scroll-content.ionic-scroll .scroll").height($scope.contontLH);
	}
	//选择重新触发
	$scope.restartLuzhu = function(){
		//$scope.reLoadCfg();
		if($rootScope.hideChanglong){
			$('#bjl_wrap').hide();
		}else{
			setTimeout(function(){
				$rootScope.initContentLuzhuH();
			},500);
		}
		bjl_hidden(0);
	}

	//初始化滚动
	$rootScope.initContentLuzhuH = function(){
		var scrollH = $('#bjl_con_wrap').height();
		var scrollLH = $(".lottery-menu.scroll-content.ionic-scroll .scroll");
		var scrollRH = $(".bet-view.scroll-content.ionic-scroll .scroll");
		$scope.contontLH = scrollLH.height();
		$scope.contontRH = scrollRH.height();
		scrollRH.height(scrollRH.height()+scrollH);
		if($scope.initLeftH==0){
			$scope.initLeftH = scrollLH.height()+scrollH;
		}
		scrollLH.height($scope.initLeftH);
	}


	$scope.initLuzhu = function(bjl_obj_arr){
        var bjl_obj = bjl_obj_arr[0];
        var cols = bjl_obj_arr[1];

		for(var i=1;i<cols + 1;i++){
			for(var j=1;j<7;j++){
				var name = 'bjl_' + i + '_' + j;
				if(bjl_obj[name]){
					$('#' + name + '>i').html(bjl_obj[name][1]);
					$('#' + name).addClass(bjl_obj[name][0]);
					if(!isNaN(bjl_obj[name][1])){
						$('#' + name + '>i').css("font-weight", "normal");
						$('#' + name + '>i').css("font-size", ".5rem");
					}
				}
			}
		}
		if($scope.bjl0){
			$('#bjl_btn0').hide();
		}
		//bjl_hidden(30.5+($scope.maxY-6)*3);
	}

	$scope.clearChecked = function(n){
		for(var i=0;i<3;i++){
			$('#bjl_btn'+i).removeClass('btn_checked');
		}
		$('#bjl_btn'+n).addClass('btn_checked');
	}

	$scope.clearClass = function (){
		$('#table_data tr td span').html('<i></i>');
		$('#table_data tr td span').attr('class', '');
	}

	//切换
	$scope.check_bjl_data = function(n,flag){
		if(!flag){
			$scope.clearClass();
			$scope.loadData1($scope.luZhuRow1[n].code);  //flag 防止多次请求
		}
		var bjlData = mani_data($scope.htmlData);
		//if(flag)   //flag 静态更新
		$scope.initTable(bjlData[1]);
		$scope.clearChecked(n);
		$scope.initLuzhu(bjlData);
	}

	//倒序
	function dataReverse(items){
		if(items) return items.slice().reverse();
		return items;
	}
	//快捷投注数组


	$scope.animalArray =  ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
	$scope.quickSxArray = [];
	//动态生成生肖特码
	$scope.dynamicTmArray = function(){
		$scope.animalYear = $rootScope.animalsYear; //动态获取今年的生肖
		var max = 49; //动态生成显示 特码最大值
		//在数组找到今年生肖的下标
		var zodiacIndex = $scope.animalArray.indexOf($scope.animalYear);
		for (var i = 0; i < $scope.animalArray.length; i++) {
				var text = $scope.animalArray[i]; //获取当前的生肖
				var index = $scope.animalArray.indexOf(text); //找到当前的生肖 在$scope.animalArray 数组的下标
				if(zodiacIndex < index){
					zodiacIndex += 12;
				}
				var m = (zodiacIndex - index) + 1;
				var num = m;
				//numberNo 动态获取的生肖特码推到此数组
				//matchTm  主要用来记录 当某个生肖的特码被选中时候 推进来 当选中这个生肖所有特码时候 生肖复选框被选中
				// $scope.quickSxArray[i] = {};
				$scope.quickSxArray[i] = {
					text:text,
					checked:false,
					numberNo:[],
					matchTm:[]
				}
				while(num <= max) {
					$scope.quickSxArray[i].numberNo.push(num);
					num += 12;
				}
		}

		//安卓百度浏览器出现滚动条划不动，在此方法模拟操作。
		// setTimeout(function(){

		// }, arguments...: any)
	}


	//生肖快捷下注
	$scope.pushNotificationChange = function(time,sxIndex){
		console.log('time >> ', time)
		console.log('sxIndex >> ', sxIndex)
		var sidebar = $('.round-3'); //获取下面 49 个特码
		if(time.checked){
			console.log('$scope.quickSxArray >>> ', $scope.quickSxArray)
			console.log('$scope.quickSxArray[sxIndex] >>> ', $scope.quickSxArray[sxIndex])
			$scope.quickSxArray[sxIndex].matchTm.splice(0,$scope.quickSxArray[sxIndex].numberNo.length);
				for (var j = 0; j < $scope.quickSxArray[sxIndex].numberNo.length; j++) {
					for (var k = 0; k < sidebar.length; k++) {
						if($scope.quickSxArray[sxIndex].numberNo[j] == parseInt(sidebar.eq(k).text())){
							sidebar.eq(k).parents('.bet').addClass('bet-choose');
							//点击生肖复选框时候  给matchTm 推来属于这个生肖的所有特码记录
							$scope.quickSxArray[sxIndex].matchTm.push(parseInt(sidebar.eq(k).text()));
							//获取到dataId 下注
							var dataId = String(sidebar.eq(k).parents('.bet').data('id'));
							var paneCode = $scope.currPane.code;
							var dataList = $scope.betData[paneCode] || [];
							//避免重复的特码下注，在此删除这个生肖已存在的，再重新添加。
							var index = dataList.indexOf(dataId);
							if(index > -1) {
								dataList.splice(index, 1);
							}
							//重新添加
							dataList.push(dataId);
							$scope.betData[paneCode] = dataList;
							calcCount();
						}
					}
				}
		}else{
			for (var j = 0; j < $scope.quickSxArray[sxIndex].numberNo.length; j++) {

				for (var k = 0; k < sidebar.length; k++) {
					if($scope.quickSxArray[sxIndex].numberNo[j] == parseInt(sidebar.eq(k).text())){
						sidebar.eq(k).parents('.bet').removeClass('bet-choose');
						//获取到dataId 取消下注
						var dataId = String(sidebar.eq(k).parents('.bet').data('id'));
						var paneCode = $scope.currPane.code;
						if(!paneCode || !dataId) {
							return;
						}
						var dataList = $scope.betData[paneCode] || [];
						var index = dataList.indexOf(dataId);
						if(index > -1) {
							dataList.splice(index, 1);
						}
						$scope.betData[paneCode] = dataList;
						calcCount();
					}
				}
				//取消选中 复选框时候  把这个生肖matchTm 记录数组 清空
				$scope.quickSxArray[sxIndex].matchTm.splice(0,$scope.quickSxArray[sxIndex].matchTm.length);
			}
		}
	}
	$rootScope.$on('setSX',function(){
        $scope.dynamicTmArray()
    });

	$scope.leftFlag = true;
	$scope.leftSideMenuIsOpen = false;
	$scope.toggleLeftSideMenu = function(flag) {
		if($scope.leftFlag){
			$scope.leftFlag = false;
			$scope.leftSideMenuIsOpen = flag;
			setTimeout(function(){
				$scope.leftFlag = true;
			}, 300)
		}
	};
})


.controller('NotcountCtrl', function($scope, $log, Tools, Lottery, $state) {

	//默认不显示红包
	if ($scope.appConfig){
		$scope.appConfig.show_bonus_act = 0;
	}

	$scope.$on('$ionicView.afterEnter', function(event, viewData) {
		$scope.onQuery();
	});

	$scope.doRefresh = function() {
		$scope.onQuery();
		$scope.$broadcast('scroll.refreshComplete');
	};

	$scope.onQuery = function() {
		Tools.ajax({
			url: '/mobile/game/getNotcount.do',
			success: function(data) {
				data = data || [];

				var dataMap = {};
				for(var i in data) {
					dataMap[data[i].gameId] = data[i];
				}

				var gameList = Lottery.getGameList();
				var dataList = [];
				for(var i in gameList) {
					var game = gameList[i];
					var map = dataMap[game.id] || {};
					dataList.push({
						id: game.id,
						name: game.name,
						count: map.totalNums || 0,
						money: map.totalMoney || 0
					});
				}
				$scope.dataList = dataList;
			}
		});
	};

	$scope.detail = function(gameId, gameName, count) {
		if(count > 0) {
			$state.go('lottery.detail', {gameId: gameId, gameName: gameName});
		}
	};
})

.controller('NotcountDetailCtrl', function($scope, $log, $stateParams, Tools, Lottery, $state, $timeout, $rootScope, My) {

	//默认不显示红包
	if ($scope.appConfig){
		$scope.appConfig.show_bonus_act = 0;
	}

	$scope.gameId = $stateParams.gameId;
	$scope.gameName = $stateParams.gameName;
	$scope.playMap = Lottery.getPlayMapByGameId($scope.gameId);

	$scope.$on('$ionicView.afterEnter', function(event, viewData) {
		$scope.onQuery();
	});

	$scope.doRefresh = function() {
		$scope.dataList = null;
		$scope.page = 1;
		$scope.isMore = true;
		$scope.onQuery();
	};

	$scope.isMore = true;
	$scope.page = 1;
	$scope.rows = 30;

	My.initPageState();

	$scope.cancelBet = function(id){
		if (confirm('您确定要撤销注单 '+id+' 吗？')){
			$.ajax({
				type: "GET",
				url: '/mobile/data/deleteCode/'+id,
				data: '',
				success: function(b) {
					alert(b);
				},
				error: function(e, b) {
					alert(e);
				}
			});
			$scope.onQuery();
		}
	};

	$scope.onQuery = function() {
		if (!$scope.isMore) {
			My.changePageState(0);
			return;
		}
		$scope.isMore = false;

		My.changePageState(2);

		Tools.ajax({
			url: '/mobile/game/getNotcountDetail.do',
			backdorp: true,
			params: {gameId:$stateParams.gameId, page:$scope.page, rows:$scope.rows},
			success: function(result) {
				$scope.totalBetMoney = result.otherData.totalBetMoney;
				if(result && result.totalCount>0 ) {
					var data = result.data;
					var dataList = data;
					$scope.dataList = $scope.dataList || [];
					$scope.dataList = $scope.dataList.concat(dataList);
					for(var i in $scope.dataList){
						if($scope.dataList[i].group_name == '牛牛'){
							$scope.dataList[i].odds = $scope.dataList[i].odds + '~2';
						}
					}
					if ($scope.rows * $scope.page < result.totalCount) {
						 $scope.page++;
						 $timeout(function() {
							 $scope.isMore = true;
						 }, 3000, false);
					}

					My.setPageState(result);
				}
				else {
					$scope.dataList = [];
					My.changePageState(0);
				}

				$scope.$broadcast('scroll.refreshComplete');
			}
		});
		$scope.$broadcast('scroll.infiniteScrollComplete');
	};
})

.controller('realBetRealCtrl', function($scope, $log, Tools, Lottery, $state, $filter, $timeout) {

	//默认不显示红包
	if ($scope.appConfig){
		$scope.appConfig.show_bonus_act = 0;
	}

	/* $scope.$on('$ionicView.afterEnter', function(event, viewData) {
		$scope.onQuery();
	}); */

	$scope.doRefresh = function() {
		$scope.dataList = null;
		$scope.page = 1;
		$scope.isMore = true;
		$scope.onQuery();
	};

	$scope.isMore = true;
	$scope.page = 1;
	$scope.rows = 30;
	$scope.params={
		startDate: ''
	}
	$scope.onQuery = function(flag) {
		if(flag){
			$scope.page = 1;
		}
		if (!$scope.isMore && !flag) {
			return;
		}
		$scope.isMore = false;
		Tools.ajax({
			url: '/mobile/report/getRealBets.do?cat=real',
			backdorp: true,
			params: {page:$scope.page, rows:$scope.rows, startDate:$scope.params.startDate},
			success: function(result) {
				$scope.totalBetMoney = result.tvalidBetAmount;
				$scope.totalResultMoney = result.tnetAmount;

				if(result && result.total>0 ) {
					var data = result.data;

					var dataList = [];
					for(var i=0; i<data.length; i++) {

						dataList.push({betTime: data[i].betTime , gameType: data[i].platformType+'/'+data[i].gameType, validBetAmount: data[i].validBetAmount, netAmount: data[i].netAmount});
					}

					$scope.dataList = $scope.dataList || [];
					$scope.dataList = flag?dataList:$scope.dataList.concat(dataList);

					if ($scope.rows * $scope.page < result.total) {
						 $scope.page++;
						 $timeout(function() {
							 $scope.isMore = true;
						 }, 3000, false);
					}
				}
				else {
					$scope.dataList = [];
				}

				$scope.$broadcast('scroll.refreshComplete');
			}
		});
		$scope.$broadcast('scroll.infiniteScrollComplete');
	};
})

.controller('realBetGameCtrl', function($scope, $log, Tools, Lottery, $state, $filter, $timeout) {

	//默认不显示红包
	if ($scope.appConfig){
		$scope.appConfig.show_bonus_act = 0;
	}

	/* $scope.$on('$ionicView.afterEnter', function(event, viewData) {
		$scope.onQuery();
	}); */

	$scope.doRefresh = function() {
		$scope.dataList = null;
		$scope.page = 1;
		$scope.isMore = true;
		$scope.onQuery();
	};

	$scope.isMore = true;
	$scope.page = 1;
	$scope.rows = 30;
	$scope.params={
		startDate: ''
	}
	$scope.onQuery = function(flag) {
		if(flag){
			$scope.page = 1;
		}
		if (!$scope.isMore && !flag) {
			return;
		}
		$scope.isMore = false;
		Tools.ajax({
			url: '/mobile/report/getRealBets.do?cat=game',
			backdorp: true,
			params: {page:$scope.page, rows:$scope.rows, startDate:$scope.params.startDate},
			success: function(result) {
				$scope.totalBetMoney = result.tvalidBetAmount;
				$scope.totalResultMoney = result.tnetAmount;

				if(result && result.total>0 ) {
					var data = result.data;

					var dataList = [];
					for(var i=0; i<data.length; i++) {

						dataList.push({betTime: data[i].betTime , gameType: data[i].platformType+'/'+data[i].gameType, validBetAmount: data[i].validBetAmount, netAmount: data[i].netAmount});
					}

					$scope.dataList = $scope.dataList || [];
					$scope.dataList = flag?dataList:$scope.dataList.concat(dataList);

					if ($scope.rows * $scope.page < result.total) {
						 $scope.page++;
						 $timeout(function() {
							 $scope.isMore = true;
						 }, 3000, false);
					}
				}
				else {
					$scope.dataList = [];
				}

				$scope.$broadcast('scroll.refreshComplete');
			}
		});
		$scope.$broadcast('scroll.infiniteScrollComplete');
	};
})

.controller('realBetCardCtrl', function($scope, $log, Tools, Lottery, $state, $filter, $timeout) {

	//默认不显示红包
	if ($scope.appConfig){
		$scope.appConfig.show_bonus_act = 0;
	}

	/* $scope.$on('$ionicView.afterEnter', function(event, viewData) {
		$scope.onQuery();
	}); */

	$scope.doRefresh = function() {
		$scope.dataList = null;
		$scope.page = 1;
		$scope.isMore = true;
		$scope.onQuery();
	};

	$scope.isMore = true;
	$scope.page = 1;
	$scope.rows = 30;
	$scope.params={
		startDate: ''
	}
	$scope.onQuery = function(flag) {
		if(flag){
			$scope.page = 1;
		}
		if (!$scope.isMore && !flag) {
			return;
		}
		$scope.isMore = false;
		Tools.ajax({
			url: '/mobile/report/getRealBets.do?cat=card',
			backdorp: true,
			params: {page:$scope.page, rows:$scope.rows, startDate:$scope.params.startDate},
			success: function(result) {
				$scope.totalBetMoney = result.tvalidBetAmount;
				$scope.totalResultMoney = result.tnetAmount;

				if(result && result.total>0 ) {
					var data = result.data;

					var dataList = [];
					for(var i=0; i<data.length; i++) {

						dataList.push({betTime: data[i].betTime , gameType: data[i].platformType+'/'+data[i].gameType, validBetAmount: data[i].validBetAmount, netAmount: data[i].netAmount});
					}

					$scope.dataList = $scope.dataList || [];
					$scope.dataList = flag?dataList:$scope.dataList.concat(dataList);

					if ($scope.rows * $scope.page < result.total) {
						 $scope.page++;
						 $timeout(function() {
							 $scope.isMore = true;
						 }, 3000, false);
					}
				}
				else {
					$scope.dataList = [];
				}

				$scope.$broadcast('scroll.refreshComplete');
			}
		});
		$scope.$broadcast('scroll.infiniteScrollComplete');
	};
})

.controller('realBetSportCtrl', function($scope, $log, Tools, Lottery, $state, $filter, $timeout) {

	//默认不显示红包
	if ($scope.appConfig){
		$scope.appConfig.show_bonus_act = 0;
	}

	/* $scope.$on('$ionicView.afterEnter', function(event, viewData) {
		$scope.onQuery();
	}); */

	$scope.doRefresh = function() {
		$scope.dataList = null;
		$scope.page = 1;
		$scope.isMore = true;
		$scope.onQuery();
	};

	$scope.isMore = true;
	$scope.page = 1;
	$scope.rows = 30;
	$scope.params={
		startDate: ''
	}
	$scope.onQuery = function(flag) {
		if(flag){
			$scope.page = 1;
		}
		if (!$scope.isMore && !flag) {
			return;
		}
		$scope.isMore = false;
		Tools.ajax({
			url: '/mobile/report/getRealBets.do?cat=sport',
			backdorp: true,
			params: {page:$scope.page, rows:$scope.rows, startDate:$scope.params.startDate},
			success: function(result) {
				$scope.totalBetMoney = result.tvalidBetAmount;
				$scope.totalResultMoney = result.tnetAmount;

				if(result && result.total>0 ) {
					var data = result.data;

					var dataList = [];
					for(var i=0; i<data.length; i++) {

						dataList.push({betTime: data[i].betTime , gameType: data[i].platformType+'/'+data[i].gameType, validBetAmount: data[i].validBetAmount, netAmount: data[i].netAmount});
					}

					$scope.dataList = $scope.dataList || [];
					$scope.dataList = flag?dataList:$scope.dataList.concat(dataList);

					if ($scope.rows * $scope.page < result.total) {
						 $scope.page++;
						 $timeout(function() {
							 $scope.isMore = true;
						 }, 3000, false);
					}
				}
				else {
					$scope.dataList = [];
				}

				$scope.$broadcast('scroll.refreshComplete');
			}
		});
		$scope.$broadcast('scroll.infiniteScrollComplete');
	};
})

.controller('realBetFishCtrl', function($scope, $log, Tools, Lottery, $state, $filter, $timeout) {

	//默认不显示红包
	if ($scope.appConfig){
		$scope.appConfig.show_bonus_act = 0;
	}

	/* $scope.$on('$ionicView.afterEnter', function(event, viewData) {
		$scope.onQuery();
	}); */

	$scope.doRefresh = function() {
		$scope.dataList = null;
		$scope.page = 1;
		$scope.isMore = true;
		$scope.onQuery();
	};

	$scope.isMore = true;
	$scope.page = 1;
	$scope.rows = 30;
	$scope.params={
		startDate: ''
	}
	$scope.onQuery = function(flag) {
		if(flag){
			$scope.page = 1;
		}
		if (!$scope.isMore && !flag) {
			return;
		}
		$scope.isMore = false;
		Tools.ajax({
			url: '/mobile/report/getRealBets.do?cat=fish',
			backdorp: true,
			params: {page:$scope.page, rows:$scope.rows, startDate:$scope.params.startDate},
			success: function(result) {
				$scope.totalBetMoney = result.tvalidBetAmount;
				$scope.totalResultMoney = result.tnetAmount;

				if(result && result.total>0 ) {
					var data = result.data;

					var dataList = [];
					for(var i=0; i<data.length; i++) {

						dataList.push({betTime: data[i].betTime , gameType: data[i].platformType+'/'+data[i].gameType, validBetAmount: data[i].validBetAmount, netAmount: data[i].netAmount});
					}

					$scope.dataList = $scope.dataList || [];
					$scope.dataList = flag?dataList:$scope.dataList.concat(dataList);

					if ($scope.rows * $scope.page < result.total) {
						 $scope.page++;
						 $timeout(function() {
							 $scope.isMore = true;
						 }, 3000, false);
					}
				}
				else {
					$scope.dataList = [];
				}

				$scope.$broadcast('scroll.refreshComplete');
			}
		});
		$scope.$broadcast('scroll.infiniteScrollComplete');
	};
})

.controller('RealBetCtrl', function($scope, $log, Tools, Lottery, $state, $filter, $timeout) {

	//默认不显示红包
	if ($scope.appConfig){
		$scope.appConfig.show_bonus_act = 0;
	}

	/* $scope.$on('$ionicView.afterEnter', function(event, viewData) {
		$scope.onQuery();
	}); */

	$scope.doRefresh = function() {
		$scope.dataList = null;
		$scope.page = 1;
		$scope.isMore = true;
		$scope.onQuery();
	};

	$scope.isMore = true;
	$scope.page = 1;
	$scope.rows = 30;
	$scope.params={
		startDate: ''
	}
	$scope.onQuery = function(flag) {
		if(flag){
			$scope.page = 1;
		}
		if (!$scope.isMore && !flag) {
			return;
		}
		$scope.isMore = false;
		Tools.ajax({
			url: '/mobile/report/getRealBets.do',
			backdorp: true,
			params: {page:$scope.page, rows:$scope.rows, startDate:$scope.params.startDate},
			success: function(result) {
				$scope.totalBetMoney = result.tvalidBetAmount;
				$scope.totalResultMoney = result.tnetAmount;

				if(result && result.total>0 ) {
					var data = result.data;

					var dataList = [];
					for(var i=0; i<data.length; i++) {

						dataList.push({betTime: data[i].betTime , gameType: data[i].platformType+'/'+data[i].gameType, validBetAmount: data[i].validBetAmount, netAmount: data[i].netAmount});
					}

					$scope.dataList = $scope.dataList || [];
					$scope.dataList = flag?dataList:$scope.dataList.concat(dataList);

					if ($scope.rows * $scope.page < result.total) {
						 $scope.page++;
						 $timeout(function() {
							 $scope.isMore = true;
						 }, 3000, false);
					}
				}
				else {
					$scope.dataList = [];
				}

				$scope.$broadcast('scroll.refreshComplete');
			}
		});
		$scope.$broadcast('scroll.infiniteScrollComplete');
	};
})

.controller('SettledCtrl', function($scope, $log, Tools, Lottery, $state, $filter, $timeout, $rootScope, My) {
	//默认不显示红包
	if ($scope.appConfig){
		$scope.appConfig.show_bonus_act = 0;
	}

	$scope.$on('$ionicView.afterEnter', function(event, viewData) {
		$scope.onQuery();
	});

	$scope.doRefresh = function() {
		$scope.dataList = null;
		$scope.page = 1;
		$scope.isMore = true;
		$scope.onQuery();
	};

	$scope.isMore = true;
	$scope.page = 1;
	$scope.rows = 30;

	My.initPageState();

	$scope.onQuery = function() {
		if (!$scope.isMore) {
			My.changePageState(0);
			return;
		}
		$scope.isMore = false;
		My.changePageState(2);
		Tools.ajax({
			url: '/mobile/report/getBetBills.do',
			backdorp: true,
			params: {page:$scope.page, rows:$scope.rows},
			success: function(result) {
				$scope.totalBetMoney = result.otherData.totalBetMoney;
				$scope.totalResultMoney = result.otherData.totalResultMoney;
				if(result && result.totalCount>0 ) {
					var data = result.data;
					var dataList = [];
					for(var i=0; i<data.length; i++) {
						var play = Lottery.getPlayByAll(data[i].playId);
						if(!play) {
							//continue;
						}
						var game = Lottery.getGame(data[i].gameId);
						if(data[i].group_name == '牛牛'){
							data[i].odds = data[i].odds + '~2';
						}
						dataList.push({turnNum: game.name + '</br>' + data[i].turnNum, money: data[i].money, resultMoney: data[i].resultMoney, detail: data[i].group_name + ' ' + data[i].play_alias + ' ' + data[i].play_name + ' ' + data[i].betInfo + '</br>@' + data[i].odds, rebate: data[i].rebate,orderNo:data[i].orderNo,lotteryNo:data[i].lotteryNo});
					}

					$scope.dataList = $scope.dataList || [];
					$scope.dataList = $scope.dataList.concat(dataList);

					if ($scope.rows * $scope.page < result.totalCount) {
						 $scope.page++;
						 $timeout(function() {
							 $scope.isMore = true;
						 }, 3000, false);
					}
					My.setPageState(result);
				}
				else {
					$scope.dataList = [];
					My.changePageState(0);
				}

				$scope.$broadcast('scroll.refreshComplete');
			}
		});
		$scope.$broadcast('scroll.infiniteScrollComplete');
	};
})



.controller('HistoryCtrl', function($scope, $log, $stateParams, $state, Tools, Lottery,$ionicHistory,$location,PATH) {
	$scope.gameHistoryList = new Array();
	if($stateParams.gameId == 7  || $stateParams.gameId == 9 || $stateParams.gameId == 11){
		Tools.tip('秒秒彩开奖结果请前往[彩票注单-下注明细]中查询');
		if($ionicHistory.backView()){
			$ionicHistory.goBack()
		}else {
			$location.path(PATH.homePath);
		}
		return false;
	}
	for(var i = 0;i<$scope.gameList.length;i++){
		if(Number($scope.gameList[i].id) != 4 && Number($scope.gameList[i].id) != 5 && Number($scope.gameList[i].id) != 7 && Number($scope.gameList[i].id) != 9 && Number($scope.gameList[i].id) != 11){
			$scope.gameHistoryList.push($scope.gameList[i]);
		}
	}

	//默认不显示红包
	if ($scope.appConfig){
		$scope.appConfig.show_bonus_act = 0;
	}

	$scope.queryData = {};
	$scope.queryData.gameId = parseInt($stateParams.gameId || Lottery.getFirstGameId());


	var getHistoryUrl = function(gameId, date) {
		if(!$scope.showDate) {
			date = '';
		}

		return "/mobile"+Tools.staticPath() + 'data/HistoryLottery.js?dateStr=' + date + '&gameId=' + gameId + '&_' + Math.random();
	};

	$scope.onChange = function() {
		$state.go($state.current.name, {gameId: $scope.queryData.gameId});
	};

	$scope.doRefresh = function() {
		$scope.onQuery();
		$scope.$broadcast('scroll.refreshComplete');
	};

	$scope.onQuery = function() {
		if(!$scope.queryData.gameId) {
			//Tools.tip('请选择游戏');
			return;
		}

		$scope.numStyle = Lottery.getNumStyle($scope.queryData.gameId);
		$scope.tpl = Lottery.getTpl($scope.queryData.gameId);

		Tools.lazyLoad([getHistoryUrl($scope.queryData.gameId, $scope.queryData.date)], function() {
			$scope.dataList = historyData;
		});
	};

	// 如果是六合彩，没有日期下拉框，由代码触发onQuery
	if($scope.queryData.gameId == 70 || $scope.queryData.gameId == 2) {
		$scope.showDate = false;
		$scope.queryData.date = moment().year();
		$scope.onQuery();
	}
	else {
		// 其他游戏有日期下拉框，由下拉框的下拉框的ng-change触发onQuery
		$scope.showDate = true;
	}

	// 幸运飞艇单独处理，如果是凌晨5点前，默认查询前一天的日期
	if($scope.queryData.gameId == 55 && moment().hour() < 5) {
		$scope.queryData.date = moment().subtract(1, 'd').format('YYYYMMDD');
		$scope.onQuery();
	}
})


.controller('ChangLongCtrl', function($scope, $log, $stateParams, Tools, Lottery, $state) {

	//默认不显示红包
	if ($scope.appConfig){
		$scope.appConfig.show_bonus_act = 0;
	}

	$scope.queryData = {};
	$scope.queryData.gameId = parseInt($stateParams.gameId || Lottery.getFirstGameId());

	$scope.onQuery = function() {
		var url = "/mobile" + Tools.staticPath() + 'data/stat.js?gameId=' + $scope.queryData.gameId + '&_' + Math.random();
		Tools.lazyLoad([url], function() {
			$scope.curStatList = curStatList;
		});
	};
	$scope.doRefresh = function() {
		$scope.onQuery();
		$scope.$broadcast('scroll.refreshComplete');
	}
	$scope.onQuery();
})

.controller('LuZhuCtrl', function($scope, $log, $stateParams, Tools, Lottery, $state) {

	//默认不显示红包
	if ($scope.appConfig){
		$scope.appConfig.show_bonus_act = 0;
	}

	$scope.luZhuGameList=[];
	var gameList = Lottery.getGameList();
	for(var g in gameList){
		var game = gameList[g];
		if(game.id==10 || game.id==70){//去除江苏快3 、 香港六合彩
			continue;
		}
		$scope.luZhuGameList.push(game);
	}
	$scope.queryData = {};
	$scope.queryData.gameId = parseInt($stateParams.gameId || Lottery.getFirstGameId());
	if($scope.queryData.gameId==10 || $scope.queryData.gameId==70){
		Tools.tip('无此类游戏路珠');
		$scope.queryData.gameId=Lottery.getFirstGameId();
	}

	loadData = function() {
		var url = "/mobile" + Tools.staticPath() + 'data/stat_game.js?gameId=' + $scope.queryData.gameId + '&_' + Math.random();
		Tools.lazyLoad([url], function() {
			$log.debug('luZhuCurData success');
			$scope.luZhuCurData=luZhuData;
			$scope.loadData1();
			$scope.loadData2();
		});
	};

	$scope.reLoadCfg = function(){
		$scope.luZhuCfgs = Lottery.getLuZhuCfg($scope.queryData.gameId);
		$scope.luZhuRow1 = $scope.luZhuCfgs["row1"];
		$scope.curCode1 = $scope.luZhuRow1[0].code;

		$scope.luZhuRow2 = $scope.luZhuCfgs["row2"];

		if($scope.luZhuRow2){
			$scope.curCode2 = $scope.luZhuRow2[0].code;
		}
		loadData();
	}

	$scope.htmlData1={};
	$scope.loadData1=function(code){
		if(code){
			$scope.curCode1=code;
		}
		$scope.htmlData1=dataReverse($scope.luZhuCurData[$scope.curCode1]);
	}


	$scope.htmlData2=[];
	$scope.loadData2=function(code){
		$scope.htmlData2=[];
		if(code){
			$scope.curCode2=code;
		}
		if(!$scope.curCode2){
			return;
		}

		var cfgs = $scope.luZhuRow2;
		for(var c in cfgs){
			var cfg = cfgs[c];
			if(cfg.code == $scope.curCode2){//获取对应的配置
				var cfgDatas = cfg.datas;
				for(var cd in cfgDatas){
					var cfgData = cfgDatas[cd];
					var htmlData={};
					htmlData.name = cfgData.name;
					htmlData.data = dataReverse($scope.luZhuCurData[cfgData.code]);//获取数据
					$scope.htmlData2.push(htmlData);
				}
				return;
			}
		}
	}

	//倒序
	function dataReverse(items){
		return items.slice().reverse();
	}

})

.controller('WeekRecordCtrl', function($rootScope, $scope, $state, Tools, My) {

	//默认不显示红包
	if ($scope.appConfig){
		$scope.appConfig.show_bonus_act = 0;
	}

	$scope.$on('$ionicView.beforeEnter', function(event, viewData) {
		onQuery();
	});

	// 需要提前的天数
	var diffDay = 0;
	// 报表是凌晨4点统计，如果当前小时数是5点前，需要额外再提前一天
	if(moment().hours() < 5) {
		//diffDay++;
	}
	var startDate = moment().subtract(6 + diffDay, 'd').format('YYYY-MM-DD');
	var endDate = moment().subtract(diffDay, 'd').format('YYYY-MM-DD');

	$scope.doRefresh = function() {
		onQuery();
		$scope.$broadcast('scroll.refreshComplete');
	};

	var onQuery = function() {
		Tools.ajax({
			method: 'GET',
			params: {startDate: startDate, endDate: endDate},
			url: '/mobile/userrech/getStatBets.do',
			success: function(result) {
				 if(!result) {
					 return;
				 }
				 var data = result.data;

				 var dataMap = {};
				 for(var i = 0; i < data.length; i++) {
					 var date = data[i].statDate.split(' ')[0];
					 dataMap[date] = data[i];
				 }

				 var dataList = [];
				 var allBetCount = 0;
				 var allRewardRebate = 0.0;
				 var now = moment().subtract(diffDay - 1, 'd');
				 for (var i = 0; i < 7; i++) {
					 var subDate = now.subtract(1, 'd');
					 var date = subDate.format('YYYY-MM-DD');
					 var obj = dataMap[date];
					 if(obj) {
						 allBetCount += parseInt(obj.betCount);
						 allRewardRebate += obj.rewardRebate;
						 dataList.push({statDate: date, week: subDate.format('dddd'), betCount: obj.betCount, rewardRebate: obj.rewardRebate});
					 }
					 else {
						 dataList.push({statDate: date, week: subDate.format('dddd'), betCount: 0, rewardRebate: 0});
					 }
				 }
				 $scope.allBetCount = allBetCount;
				 $scope.allRewardRebate = allRewardRebate.toFixed(2);
				 $scope.weekRecordList = dataList;
			}
		});
	};

	$scope.detail = function(statDate, betCount) {
		if(betCount > 0) {
			$state.go('lottery.day', {statDate: statDate});
		}
	};
})


.controller('DayRecordCtrl', function($scope, $log, Tools, Lottery, $state, $stateParams) {

	//默认不显示红包
	if ($scope.appConfig){
		$scope.appConfig.show_bonus_act = 0;
	}

	$scope.statDate = $stateParams.statDate;

	$scope.$on('$ionicView.afterEnter', function(event, viewData) {
		$scope.onQuery();
	});

	$scope.doRefresh = function() {
		$scope.onQuery();
		$scope.$broadcast('scroll.refreshComplete');
	};

	$scope.onQuery = function() {
		Tools.ajax({
			url: '/mobile/userrech/getTotalStatBets.do?date='+$scope.statDate,
			params: {date: $scope.statDate},
			success: function(data) {
				data = data || [];

				var dataMap = {};
				for(var i in data) {
					dataMap[data[i].gameId] = data[i];
				}

				var gameList = Lottery.getGameList();
				var dataList = [];
				for(var i in gameList) {
					var game = gameList[i];
					var map = dataMap[game.id] || {};
					dataList.push({
						id: game.id,
						name: game.name,
						count: map.betCount || 0,
						money: map.betMoney || 0,
						win: map.rewardRebate || 0,
						settled: map.rewardRebate ? 1 : 1
					});
				}
				$scope.dataList = dataList;
			}
		});
	};

	$scope.toWeek = function() {
		$state.go('lottery.week');
	};

	$scope.detail = function(gameId, count, settled) {
		if(count > 0) {
			$state.go('lottery.day_detail', {gameId: gameId, statDate: $scope.statDate, settled: settled});
		}
	};
})

.controller('DayDetailCtrl', function($scope, $log, $state, $stateParams, Tools, Lottery, $timeout, My, $rootScope) {

	//默认不显示红包
	if ($scope.appConfig){
		$scope.appConfig.show_bonus_act = 0;
	}

	var gameId = $stateParams.gameId;
	var settled = $stateParams.settled;
	$scope.gameId = $stateParams.gameId;
	$scope.statDate = $stateParams.statDate;
	$scope.game = Lottery.getGame(gameId);
	$scope.playMap = Lottery.getPlayMapByGameId(gameId);

	$scope.$on('$ionicView.afterEnter', function(event, viewData) {
		$scope.onQuery();
	});

	$scope.doRefresh = function() {
		$scope.dataList = null;
		$scope.page = 1;
		$scope.isMore = true;
		$scope.onQuery();
	};

	$scope.isMore = true;
	$scope.page = 1;
	$scope.rows = 30;

	My.initPageState();

	$scope.onQuery = function() {
		if (!$scope.isMore) {
			My.changePageState(0);
			return;
		}
		$scope.isMore = false;
		My.changePageState(2);
		Tools.ajax({
			url: '/mobile/report/getUserBets.do?settled='+settled,
			backdorp: true,
			params: {gameId: gameId, date: $scope.statDate, page:$scope.page, rows:$scope.rows},
			success: function(result) {
				$scope.totalBetMoney = result.otherData.totalBetMoney;
				$scope.totalResultMoney = result.otherData.totalResultMoney;
				if(result && result.totalCount>0 ) {
					var data = result.data;
					var dataList = [];
					dataList = data;
					$scope.dataList = $scope.dataList || [];
					$scope.dataList = $scope.dataList.concat(dataList);
					for(var i in $scope.dataList){
						if($scope.dataList[i].group_name == '牛牛'){
							$scope.dataList[i].odds = $scope.dataList[i].odds + '~2';
						}
					}
					if ($scope.rows * $scope.page < result.totalCount) {
						 $scope.page++;
						 $timeout(function() {
							 $scope.isMore = true;
						 }, 3000, false);
					}
					My.setPageState(result);
				}
				else {
					$scope.dataList = [];
					My.changePageState(0);
				}

				$scope.$broadcast('scroll.refreshComplete');
			}

		});
		$scope.$broadcast('scroll.infiniteScrollComplete');
	};

	$scope.toWeek = function() {
		$state.go('lottery.week');
	};

	$scope.toDay = function() {
		$state.go('lottery.day', {statDate: $scope.statDate});
	};
})

.controller('NiuniuCtrl', function($scope, $timeout, $element, $log, $filter, $stateParams, $ionicPopover, Lottery, Tools, My) {
	$scope.NNscale = '1.38'; //缩放系数
	$scope.NNtop = '-46px'; //调整高度
	$scope.showingResult = false;
	$scope.issueNums = [];
	$scope.resultCards = [];
	$scope.isWin = [];
	(function init() {
		var w = $element[0].clientWidth;
		var scale = w / 300;
		$scope.NNscale = scale;
		$timeout(function() {
			var h = $element[0].clientHeight;
			var topMost,diff;
			if(h>330){
				topMost = -55 * scale;
				diff = h - 390 * scale;
			}else {
				topMost = -120 * scale;
				diff = h - 450 * scale;
			}
			$scope.NNtop = diff > 0 ? '0px' : (diff < topMost ? topMost + 'px' : diff + 'px');
			$('.bet-view').css('bottom',1);
		}, 350)
	})();

	$scope.onPlayClick = function(area, isSelect) {
		angular.element($element[0].querySelector('.t-nnsel' + parseInt(area))).toggleClass('hide', !isSelect);
	}

	$scope.$on('Lottery.Reset', function() {
		angular.element($element[0].querySelectorAll('.nn-selected')).addClass('hide');
	});

	$scope.$watch('shareData.waitOpen', function(val, old_val) {
		if(val !== old_val && val == false) {
			showLastResult();
		}
	});

	$scope.showPreNum = function () {
		showLastResult();
	}

	function showLastResult(){
		var nnRanks = $scope.shareData.nnRanks;
		$scope.isWin = [];
		var winNum = 0;

		if(nnRanks){
			$scope.issueNums = $scope.shareData.openNums.split(',');
			$scope.resultCards = nnRanks.map(function(_, index) {
				var nums = $scope.issueNums.slice(index, index + 5);
				var bigCardIndex = '';
				if(nnRanks[0] != nnRanks[index]) {
					$scope.isWin.push(nnRanks[index] > nnRanks[0]);
				}else {
					$scope.isWin.push(nnRanks[index] > 6 && parseInt($scope.issueNums[index]) > parseInt($scope.issueNums[0]));
				}
				return nums.map(function(num) {
					var idx = nnRanks[index];
					if(num >= 10) {
						if(idx<=2){
							bigCardIndex = 0;
						}else if(idx>2 && idx <=4){
							bigCardIndex = 1;
						}else if(idx>4 && idx <=6){
							bigCardIndex = 2;
						}else if(idx>6 && idx <=10){
							bigCardIndex = 3;
						}
					}
					return 'card-' + (num >= 10 ? [10, 11, 12, 13][bigCardIndex] : num) + ' ' +
						'card-type' + ['a', 'b', 'c', 'd'][Math.floor(Math.random() * 4)]
				});
			});
			for(var i in $scope.isWin){
				if(!$scope.isWin[i]){
					winNum++;
				}
			}
			if(winNum == 6){
				$scope.isWin[0] = true;
			}
			$scope.showingResult = true;
			$timeout(function() {
				$scope.showingResult = false;
			}, 10000);
		}
	}
})


.controller('tigerBetListCtrl', function($scope, $log, Tools, Lottery, $state, $filter, $timeout) {

	$scope.$on('$ionicView.afterEnter', function(event, viewData) {
		$scope.onQuery();
	});

	$scope.doRefresh = function() {
		$scope.dataList = null;
		$scope.page = 1;
		$scope.isMore = true;
		$scope.onQuery();
	};

	$scope.isMore = true;
	$scope.page = 1;
	$scope.rows = 30;
	$scope.onQuery = function() {
		if (!$scope.isMore) {
			return;
		}
		$scope.isMore = false;
		Tools.ajax({
			method:'GET',
			url: '/report/getTigerBets.do?t='+Date.parse(new Date()),
			backdorp: true,
			params: {page:$scope.page, rows:$scope.rows},
			success: function(result) {
				$scope.totalBetMoney = result.tvalidBetAmount;
				//$scope.totalResultMoney = result.tnetAmount;
				$scope.totalResultMoney = 0;
				var totalWin = 0;
				if(result && result.total>0 ) {
					var data = result.data;
					var dataList = [];
					for(var i=0; i<data.length; i++) {
						dataList.push({betTime: data[i].actionTime,id: data[i].id,gamename: data[i].gamename,betMoney:data[i].betMoney,winMoney:data[i].winMoney,lines:data[i].lines,winCount:data[i].winCount });
						totalWin += parseFloat((data[i].winMoney - 0));
					}
					$scope.totalResultMoney = (totalWin - $scope.totalBetMoney);
					$scope.dataList = $scope.dataList || [];
					$scope.dataList = $scope.dataList.concat(dataList);

					if ($scope.rows * $scope.page < result.total) {
						 $scope.page++;
						 $timeout(function() {
							 $scope.isMore = true;
						 }, 3000, false);
					}
				}
				else {
					$scope.dataList = [];
				}

				$scope.$broadcast('scroll.refreshComplete');
			}
		});
		$scope.$broadcast('scroll.infiniteScrollComplete');
	};
})
.controller('ugGameListCtrl', function($scope, $log, Tools, Lottery, $state, $filter, $timeout) {
	$scope.gameList = [{
		'name': 'tiger',
		'enable': false
	}, {
		'name': 'fruit',
		'enable': false
	}, {
		'name': 'lhc',
		'enable': false
	}, {
		'name': 'bobing',
		'enable': false
	}];
	Tools.ajax({
		type: "get",
		url: '/mobile/egame/getGame',
		success: function success(result) {
			for (var i in $scope.gameList) {
				if(result.game.tigerEnable){
					$scope.gameList[0].enable = true;
				}
				if(result.game.fruitEnable){
					$scope.gameList[1].enable = true;
				}
				if(result.game.lhcEnable){
					$scope.gameList[2].enable = true;
				}
				if(result.game.bobingEnable){
					$scope.gameList[3].enable = true;
				}
			}
		}
	});
})
.controller('fruitBetListCtrl', function($scope, $log, Tools, Lottery, $state, $filter, $timeout, My) {

	$scope.$on('$ionicView.afterEnter', function(event, viewData) {
		$scope.onQuery();
	});

	$scope.doRefresh = function() {
		$scope.dataList = null;
		$scope.page = 1;
		$scope.isMore = true;
		$scope.onQuery();
	};
	$scope.totalBetMoney = 0;
	$scope.isMore = true;
	$scope.page = 1;
	$scope.rows = 10;
	$scope.fruit = {

	}

	$scope.$on('$ionicView.afterEnter', function(event, viewData) {
		$scope.onQuery();
	});
	$scope.fruitElement1 = [
		{
			id:0,
			name:'橙子'
		},
		{
			id:1,
			name:'铃铛'
		},
		{
			id:2,
			name:'苹果'
		},
		{
			id:3,
			name:'木瓜'
		},
		{
			id:4,
			name:'西瓜'
		},
		{
			id:5,
			name:'BAR'
		},
		{
			id:6,
			name:'77'
		},
		{
			id:7,
			name:'双星'
		}
	]
	$scope.fruitElement2 = [
		{
			id:0,
			name:'M4A1'
		},
		{
			id:1,
			name:'背包'
		},
		{
			id:2,
			name:'手榴弹'
		},
		{
			id:3,
			name:'汽车'
		},
		{
			id:4,
			name:'八倍镜'
		},
		{
			id:5,
			name:'BAR'
		},
		{
			id:6,
			name:'医疗包'
		},
		{
			id:7,
			name:'平底锅'
		}
	]
	My.initPageState();
	$scope.fruitElement = [];
	var totalWin = 0;
	$scope.totalResultMoney = 0;
	$scope.onQuery = function() {
		if (!$scope.isMore) {
			My.changePageState(0);
			return;
		}
		$scope.isMore = false;
		My.changePageState(2);
		Tools.ajax({
			method:'POST',
			url: '/mobile/egame/fruitBetLog?t='+Date.parse(new Date()),
			backdorp: true,
			params: {page:$scope.page, rows:$scope.rows, gameId:''},
			success: function(result) {
				result = result.data;
				result.totalCount = result.total;
				if(result && result.total>0 ) {
					var data = result.data;
					var dataList = [];
					if(result.data[0].iconSet == 'pubg'){
						$scope.fruitElement = $scope.fruitElement2;
					}else {
						$scope.fruitElement = $scope.fruitElement1;
					}
					for(var i=0; i<result.data.length; i++) {
						var fruitName = '';
						for(var j in $scope.fruitElement){
							if(data[i].winFruitId == $scope.fruitElement[j].id){
								fruitName = $scope.fruitElement[j].name
							}
						}
						if(data[i].odds == 500){
							fruitName = 'goodLuck';
						}
						if(data[i].odds == 0){
							fruitName = 'badLuck';
						}

						var $betArr = '';
						if(result.data[i] && result.data[i]['detail']){
							if(result.data[i]['detail']['betBean']){
								for(var j =0;j<result.data[i]['detail']['betBean'].length;j++){
									for(var k in $scope.fruitElement){
										if(result.data[i]['detail']['betBean'][j].fruitId == $scope.fruitElement[k].id){
											$betArr += '<span>'+$scope.fruitElement[k].name+'</span>' + '<span>x'+result.data[i]['detail']['betBean'][j].money+'</span><br>'
										}
									}
								}
							}
						}

						dataList.push({betTime: data[i].actionTime,id: data[i].id,gamename: data[i].name,betMoney:$betArr,winMoney:data[i].win_money,lines:fruitName,winCount:data[i].odds });
						totalWin += parseFloat((data[i].win_money - 0));
						$scope.totalBetMoney += parseFloat(data[i].bet_money-0)
					}
					$scope.totalResultMoney = (totalWin - $scope.totalBetMoney);
					$scope.dataList = $scope.dataList || [];
					$scope.dataList = $scope.dataList.concat(dataList);
					if ($scope.rows * $scope.page < result.total) {
						 $scope.page++;
						 $timeout(function() {
							 $scope.isMore = true;
						 }, 1000, false);
					}
					My.setPageState(result);
				}
				else {
					$scope.dataList = [];
					My.changePageState(0);
				}
				$scope.$broadcast('scroll.refreshComplete');
			}
		});
		$scope.$broadcast('scroll.infiniteScrollComplete');
	};

})

.controller('lhcBetListCtrl', function($scope, $log, Tools, Lottery, $state, $filter, $timeout, My) {

	$scope.$on('$ionicView.afterEnter', function(event, viewData) {
		$scope.onQuery();
	});

	$scope.doRefresh = function() {
		$scope.dataList = null;
		$scope.page = 1;
		$scope.isMore = true;
		$scope.onQuery();
	};
	$scope.totalBetMoney = 0;
	$scope.isMore = true;
	$scope.page = 1;
	$scope.rows = 10;
	$scope.fruit = {

	}

	$scope.$on('$ionicView.afterEnter', function(event, viewData) {
		$scope.onQuery();
	});
	$scope.fruitElement = [
		{
			id:0,
			name:'鼠'
		},
		{
			id:1,
			name:'牛'
		},
		{
			id:2,
			name:'虎'
		},
		{
			id:3,
			name:'兔'
		},
		{
			id:4,
			name:'龙'
		},
		{
			id:5,
			name:'蛇'
		},
		{
			id:6,
			name:'马'
		},
		{
			id:7,
			name:'羊'
		},
		{
			id:8,
			name:'猴'
		},
		{
			id:9,
			name:'鸡'
		},
		{
			id:10,
			name:'狗'
		},
		{
			id:11,
			name:'猪'
		},
		{
			id:12,
			name:'野兽'
		},
		{
			id:13,
			name:'家禽'
		}
	]
	My.initPageState();
	var totalWin = 0;
	$scope.totalResultMoney = 0;
	$scope.onQuery = function() {
		if (!$scope.isMore) {
			My.changePageState(0);
			return;
		}
		$scope.isMore = false;
		My.changePageState(2);
		Tools.ajax({
			method:'POST',
			url: '/mobile/egame/lhcBetLog?t='+Date.parse(new Date()),
			backdorp: true,
			params: {page:$scope.page, rows:$scope.rows, gameId:''},
			success: function(result) {
				result = result.data;
				result.totalCount = result.total;
				if(result && result.total>0 ) {
					var data = result.data;
					var dataList = [];
					for(var i=0; i<result.data.length; i++) {
						var fruitName = '';
						for(var j in $scope.fruitElement){
							if(data[i].result_number == $scope.fruitElement[j].id){
								fruitName = $scope.fruitElement[j].name
							}
						}
						var $betArr = '';
						if(result.data[i] && result.data[i]['detail']){
							if(result.data[i]['detail']['betBean']){
								for(var j =0;j<result.data[i]['detail']['betBean'].length;j++){
									for(var k in $scope.fruitElement){
										if(result.data[i]['detail']['betBean'][j].fruitId == $scope.fruitElement[k].id){
											$betArr += '<span>'+$scope.fruitElement[k].name+'</span>' + '<span>x'+result.data[i]['detail']['betBean'][j].money+'</span><br>'
										}
									}
								}
							}
						}
						var betDetail = result.data[i].detail.detail.split(',');
						var $bet = '';

						for(var j in $scope.fruitElement){
							if(betDetail[j] != 0){
								$bet += '<span>'+$scope.fruitElement[j].name +'x' +betDetail[j]+'</span><br>';
							}
						}


						dataList.push({betTime: data[i].actionTime,id: data[i].id,gamename: data[i].name,betMoney:$bet,winMoney:data[i].win_money,lines:fruitName,sxOdds:data[i].odds.sxOdds,typeOdds:data[i].odds.typeOdds });
						totalWin += parseFloat((data[i].win_money - 0));
						$scope.totalBetMoney += parseFloat(data[i].bet_money-0)
					}
					$scope.totalResultMoney = accSub(totalWin,$scope.totalBetMoney);
					$scope.dataList = $scope.dataList || [];
					$scope.dataList = $scope.dataList.concat(dataList);
					if ($scope.rows * $scope.page < result.total) {
						 $scope.page++;
						 $timeout(function() {
							 $scope.isMore = true;
						 }, 1000, false);
					}
					My.setPageState(result);
				}
				else {
					$scope.dataList = [];
					My.changePageState(0);
				}
				$scope.$broadcast('scroll.refreshComplete');
			}
		});
		$scope.$broadcast('scroll.infiniteScrollComplete');
	};
})
.controller('bobingBetListCtrl', function($scope, $log, Tools, Lottery, $state, $filter, $timeout, My) {
	$scope.$on('$ionicView.afterEnter', function(event, viewData) {
		$scope.onQuery();
	});

	$scope.doRefresh = function() {
		$scope.dataList = null;
		$scope.page = 1;
		$scope.isMore = true;
		$scope.onQuery();
	};
	$scope.totalBetMoney = 0;
	$scope.isMore = true;
	$scope.page = 1;
	$scope.rows = 10;

	$scope.$on('$ionicView.afterEnter', function(event, viewData) {
		$scope.onQuery();
	});

	My.initPageState();
	var totalWin = 0;
	$scope.totalResultMoney = 0;
	$scope.onQuery = function() {
		if (!$scope.isMore) {
			My.changePageState(0);
			return;
		}
		$scope.isMore = false;
		My.changePageState(2);
		Tools.ajax({
			method:'POST',
			url: '/mobile/egame/bobingBetLog?t='+Date.parse(new Date()),
			backdorp: true,
			params: {page:$scope.page, rows:$scope.rows, gameId:''},
			success: function(result) {
				result = result.data;
				result.totalCount = result.total;
				if(result && result.total>0 ) {
					var data = result.data;
					var dataList = [];
					for(var i=0; i<result.data.length; i++) {
						dataList.push({betTime: data[i].actionTime,id: data[i].id,gamename: data[i].name,winMoney:data[i].win_money,lines:data[i].result_number,betMoney:data[i].bet_money,odds:data[i].odds.odds });
						totalWin = accAdd(data[i].win_money,totalWin);
						$scope.totalBetMoney = accAdd(data[i].bet_money,$scope.totalBetMoney);
					}
					$scope.totalResultMoney = accSub(totalWin,$scope.totalBetMoney);
					$scope.dataList = $scope.dataList || [];
					$scope.dataList = $scope.dataList.concat(dataList);
					if ($scope.rows * $scope.page < result.total) {
						 $scope.page++;
						 $timeout(function() {
							 $scope.isMore = true;
						 }, 1000, false);
					}
					My.setPageState(result);
				}
				else {
					$scope.dataList = [];
					My.changePageState(0);
				}
				$scope.$broadcast('scroll.refreshComplete');
			}
		});
		$scope.$broadcast('scroll.infiniteScrollComplete');
	};
})

.controller('changLongBetCtrl', function($scope, Tools, $ionicScrollDelegate, $rootScope, $ionicPopup) {
	$scope.gameList = [];
	$scope.historyBetList = [];
	$scope.tab = $rootScope.changlongTab || 1; // 1长龙 2 投注
	$scope.betAmount = '';
	$scope.choosedGame = {
		bet: {},
		game: {}
	};
	$scope.balance = 0;

	// 动态计算滚动容器高度
	$scope.scrollHeight = initScrollHeight();
	$scope.onrefresh = false; // 是否刷新中
	var COUNT = 10; // 拉取最新列表 间隔时间（S）
	var timer = null; // 定时器
	var times = 0; // 计数器 COUNT 秒后重新拉取 数据
	var canFresh = true; // 控制刷新间隔

	var url1 = '/mobile/static/data/changlongaide.js'; // 获取游戏列表
	var url2 = '/mobile/Data/postCode'; // 下注
	var url3 = '/mobile/report/getUserFastBets.do'; // 获取用户最新投注
	var url4 = '/mobile/game/getMoney.do'; // 获取账户余额

	$scope.checkTab = function(type) {
		if (type === $scope.tab) { return false}
		$scope.tab = type;
		if (type === 2) {
			getHistoryBetList();
			$scope.scrollHeight = $scope.scrollHeight + 55
			$ionicScrollDelegate.scrollTop();
		} else {
			$scope.scrollHeight = initScrollHeight()
		}
	}

	$scope.filterTime = function(times) {
		var s = times % 60;
		var secound = s < 10 ? '0'+ s : s;
		var m = parseInt(times / 60) % 60;
		var minute = m < 10 ? '0'+ m : m;
		var h = parseInt(times / 3600);
		var hour = h === 0 ? '' : h < 10 ? '0'+ h : h;

		return (hour ? (hour + ':') : '') + minute + ':' + secound;
	}

	// 选择 大小单双
	$scope.chooseGame = function(bet, game) {

		if (Math.floor(game.fengpanCountdown) < 0) {
			return false;
		}

		if (bet.playId === $scope.choosedGame.bet.playId) {
			$scope.choosedGame.bet = {};
			$scope.choosedGame.game = {};
			return false;
		}

		$scope.choosedGame.bet = bet;
		$scope.choosedGame.game = game;
	}

	// 投注按钮
	$scope.goBet = function () {
		if (!$scope.choosedGame.bet.playId) {
			Tools.tip('请选择一注号码投注');
			return false;
		} else if (!$scope.betAmount) {
			Tools.tip('投注金额不能为空');
			return false;
		} else if ($scope.betAmount * 1 === 0) {
			Tools.tip('投注金额不能为0元');
			$scope.betAmount = '';
			return false;
		}

		changlongBet();
	}

	// 清空
	$scope.clearBet = function (type) {
		if(!type){
			$scope.betAmount = '';
		}
		$scope.choosedGame.bet = {};
		$scope.choosedGame.game = {};
	}

	$scope.filterBetAmount = function (e) {
		if (!$scope.betAmount) {
			return false
		}

		// 不能以点开头
		if ($scope.betAmount === '.') {
			$scope.betAmount = "";
			return false;
		}

		// 出现多个 . 删除之后的.
		var arr = $scope.betAmount.split('.');
		if (arr.length > 2) {
			$scope.betAmount = arr[0] + '.' + arr[1];
			return false;
		}

		var arr2 = $scope.betAmount.replace(/[^\d.]/g, '').split('.');
		// 如果有小数点 并且小数点后面大于3位
		if (arr2.length > 1 && arr2[1].length > 3) {
			$scope.betAmount = arr2[0] + '.' + arr2[1].slice(0, 3);
			return false;
		}

		// 如果最后一位是小数点
		if ($scope.betAmount.length === 7 && arr2[1] === '') {
			$scope.betAmount = $scope.betAmount.replace(/\./g, '');
		}
	}

	$scope.refresh = function (flag) {
		if (flag === true) {
			$scope.onrefresh = true;
		}

		setTimeout(function() {
			$scope.onrefresh = false;
		}, 500)

		if (!canFresh) {
			return false;
		}
		// 刷新间隔10秒
		Tools.ajax({
			type: "get",
			url: url4,
			params: {}, // gameId zId
			success: function success(result) {
				// $scope.historyBetList = result;

				canFresh = false;
				setTimeout(function() {
					canFresh = true;
				}, COUNT * 1000)

				$scope.balance = result;
			}
		})
	}

	$scope.refresh();

	$scope.clearInterval = function () {
		clearInterval(timer);
		$rootScope.changlongTab = 1;
	}

	// 解决UC浏览器 失去焦点不回弹BUG
	$scope.kickBack = function () {
		setTimeout(function (params) {
			window.scrollTo(0, document.body.scrollTop + 1);
			document.body.scrollTop >= 1 && window.scrollTo(0, document.body.scrollTop - 1);
		},10)
	}

	// 初始化滚动高度
	function initScrollHeight() {
		return parseInt(window.innerHeight) - 42 * 2 - 55
	}

	// 投注
	function changlongBet() {

		var data = {
			gameId: $scope.choosedGame.game.gameId, // 游戏ID
			turnNum: $scope.choosedGame.game.issue, // 期数
			totalNums: 1, // 下注数
			tag: 1,//标识
			totalMoney: $scope.betAmount, // 总下注金额
			betSrc: 0,
			ftime: lt_timer2($scope.choosedGame.game.endtime), // 时间戳
			betBean: [{
				playId: $scope.choosedGame.bet.playId, // 玩法ID
				odds: $scope.choosedGame.bet.odds, // 倍数
				rebate: 0,
				money: $scope.betAmount // 下注金额
			}]
		};

		Tools.ajax({
			type: "post",
			url: url2 + '?t=' + Date.parse(new Date()),
			params: data,
			success: function success(res) {
				if (res.success) {
					$scope.clearBet(1);
				}
				// 刷新金额
				Tools.ajax({
					type: "get",
					url: url4,
					params: {}, // gameId zId
					success: function success(result) {
						$scope.balance = result;
					}
				})
				Tools.tip(res.msg);
			}
		})

	}

	function getHistoryBetList() {
		Tools.ajax({
			type: "get",
			url: url3,
			params: {}, // gameId zId
			success: function success(result) {
				// $scope.historyBetList = result;
				$scope.historyBetList = result;
			}
		})
	}

	function getGameList() {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}

		Tools.ajax({
			type: "get",
			url: url1,
			success: function success(result) {
				if ($scope.gameList.length === 0) {
					$scope.gameList = result;
				} else {
					for(var i = 0; i< result.length; i++) {
						if (!$scope.gameList[i]) {
							$scope.gameList[i] = {}
						}
						for (var key in result[i]) {
							$scope.gameList[i][key] = result[i][key]
						}
					}
					$scope.gameList.length = result.length
				};
				timer = setInterval(function() {
					for(var i = 0; i< $scope.gameList.length; i++) {
						$scope.gameList[i] && $scope.gameList[i].fengpanCountdown--;
					}

					$scope.$apply();

					times++;
					if (times >= COUNT) {
						times = 0;
						getGameList();
					}
				}, 1000)
			}
		})
	}

	function lt_timer2(a) {
		var b = -1;
		if (a) {
			b = (format(a).getTime()) / 1000;
			//时区处理
			var tz = format(a).getTimezoneOffset();
			var tz_diff = tz+480;
			b = b - tz_diff * 60;
		}
		return b;
	}

	$scope.changLongExplain = function () {
		$scope.ionicPopup = $ionicPopup.show({
			template: '<div class="content">'+
            '<p>长龙助手是对快3、时时彩、PK10、六合彩、幸运飞艇、北京赛车等特定玩法的“大小单双” 开奖结果进行跟踪统计，并可进行快捷投注的助手工具；</p>' +
            '<p>每期出现大、小、单、双的概率为50%，如果连续3期及以上的开奖结果相同，称之为“长龙”，通常会采用倍投的方式进行“砍龙”或“顺龙”。</p>'+
            '<h3 class="long-ico">1、什么是砍龙？</h3> <p class="long-tab">如连续开5期“单”，可以选择“双”进行投注，这种投注方案称之为“砍龙”；</p>' +
            '<h3 class="long-ico">2、什么是顺龙？</h3> <p class="long-tab">如连续开5期“单”，继续选择“单”进行投注，这种投注方案称之为“顺龙”；</p>' +
            '<h3 class="long-ico">3、什么是倍投？</h3> <p class="long-tab">倍投是一种翻倍投注方式，是为了保障能够在“砍龙”或“顺龙”的过程中持续盈利的一种投注方式。</p>'+
        '</div>',
			title: '游戏规则',
			scope: $scope,
			cssClass: 'changLongExplain',
			buttons: [
			{
				text: '确定'
			},
			]
		});
	}

	getGameList();
	getHistoryBetList();
})

.controller('changLongBetDetailCtrl', function($scope, $stateParams, Tools, $rootScope) {
	$scope.betDetail = {};
	$rootScope.changlongTab = 2;
	Tools.ajax({
		type: "get",
			url: '/mobile/report/getUserFastBets.do?zid=' + $stateParams.betId,
			success: function success(result) {
				$scope.betDetail = result[0];
			}
	});
})

.controller('changLongExplainCtrl', function($scope, $stateParams, Tools, $rootScope) {});

//changLongExplainCtrl
/**
 * 组合数算法
 * @param len
 * @param size
 * @returns {Array}
 */
function choose(len, size) {
	var allResult = [];
	var arr = [];
	for (var i = 0; i < len; i++) {
		arr[i] = i;
	}

	(function(arr, size, result) {
		var arrLen = arr.length;
		if (size > arrLen) {
			return;
		}
		if (size == arrLen) {
			allResult.push([].concat(result, arr))
		} else {
			for (var i = 0; i < arrLen; i++) {
				var newResult = [].concat(result);
				newResult.push(arr[i]);

				if (size == 1) {
					allResult.push(newResult);
				} else {
					var newArr = [].concat(arr);
					newArr.splice(0, i + 1);
					arguments.callee(newArr, size - 1, newResult);
				}
			}
		}
	})(arr, size, []);

	return allResult;
}

function lt_timer2(a) {
    var b = -1;
    if (a) {
        b = (format(a).getTime()) / 1000;
		//时区处理
		var tz = format(a).getTimezoneOffset();
		var tz_diff = tz+480;
		b = b - tz_diff * 60;
    }
    return b
}

function format(a) {
    return new Date(a.replace(/[\-\u4e00-\u9fa5]/g, "/"))
}

function display_bjl(n){
	if(n==0){
		$('#bjl_cl_wrap').hide();
		$('#bjl_lz_wrap').show();
		$('#bjl_luzhu_btn').addClass('bjl_checked_btn');
		$('#bjl_changlong_btn').removeClass('bjl_checked_btn');
	}else{
		$('#bjl_lz_wrap').hide();
		$('#bjl_cl_wrap').show();
		$('#bjl_changlong_btn').addClass('bjl_checked_btn');
		$('#bjl_luzhu_btn').removeClass('bjl_checked_btn');
	}
}

function bjl_hidden(n){
	 $('#bjl_wrap').height(n+'px');
	 //if(n==0) hideContentH();
}



//填充算法
function mani_data(table_arr) {

    var table_arr = table_arr;
    var bjl_obj = {};
    var x = 1; //横坐标
    var y = 1; //纵坐标
    var z = 1; //哈希查找初始位置
    var l = 0; //下游空间
    var c = 0; //总列数
    for (var i in table_arr) {

        y = 1;

		var case_con = table_arr[i][0];
        var case_len = table_arr[i].length; //每组数目
        var case_type = i%2==0?'big':isNaN(case_con)?'small':'big';

        //计算下游空间
        while (true) {
            l = 0;

            for (var m = 1; m < 7; m++) {
                var down = bjl_obj['bjl_' + z + '_' + (m + 1)];
                var left = bjl_obj['bjl_' + (z - 1) + '_' + m];

                if (
                    (bjl_obj['bjl_' + z + '_' + m] == undefined &&
                        (down == undefined || down[0] != case_type) &&
                        (left == undefined || left[0] != case_type))||(!isNaN(case_con))
                ) {
                    l++;
                } else break;
            }
            if (l < 2) {
                z++;
                continue;
            } else break;
        }

        x = z;

        //竖列填充
        for (var j = 1; j < (case_len < l + 1 ? case_len + 1 : l + 1); j++) {
            bjl_obj['bjl_' + x + '_' + y] = [case_type, case_con];
            y++;
            z = x + 1;
            if (x > c) c = x;
        }

        //拐弯填充
        if (case_len > l) {
            y = l;

            for (var k = 0; k < case_len - l; k++) {
                x++;
                bjl_obj['bjl_' + x + '_' + y] = [case_type, case_con];
            }

            if (x > c) c = x;
        }
    }
    return [bjl_obj, c];

}

//动态计算高度
function bodyScroll(event){
	//监听
    $(".bet-view.scroll-content.ionic-scroll").scroll(function(){
		 var viewH = $(this).height();//可见高度
		 var contentH = $(this).get(0).scrollHeight;//内容高度
		 var scaleH = parseInt($(".bet-view.scroll-content.ionic-scroll .scroll").css('transform').split('(')[1].split(')')[0].split(',').pop()); //滚动距离
		 var bjlY = contentH - viewH + scaleH;
		 var bjlH = $('#bjl_con_wrap').height();
		 if(bjlY < bjlH){
			 bjl_hidden(bjlH-bjlY<=bjlH?bjlH-bjlY:bjlH); //跟随滚动
		 }else{
			  bjl_hidden(0);
		 }
	});
}

function imgShow(src){
	$('#imgShow').html('<div id="outerdiv">\
						<div id="innerdiv" style="position:absolute;">\
							<img id="bigimg" src="/images/loader.gif" />\
						</div>\
					</div>');
	$('#bigimg').attr("src", src);
	$("<img/>").attr("src", src).load(function(){
		var windowW = IsPC() ? $('.pane').width() : $(window).width();
		var windowH = IsPC() ? $('.pane').height() : $(window).height();
		var realWidth = this.width;
		var realHeight = this.height;
		var imgWidth, imgHeight;
		var scale = 0.9;//缩放尺寸，当图片真实宽度和高度大于窗口宽度和高度时进行缩放
		var scaleMin = 1.2;
		var scaleMid = 1.5;
		var scaleMax = 2.0;
		if(realHeight>windowH*scale) {//判断图片高度
			imgHeight = windowH*scale;//如大于窗口高度，图片高度进行缩放
			imgWidth = imgHeight/realHeight*realWidth;//等比例缩放宽度
			if(imgWidth>windowW*scale) {//如宽度扔大于窗口宽度
				imgWidth = windowW*scale;//再对宽度进行缩放
			}
		} else if(realWidth>windowW*scale) {//如图片高度合适，判断图片宽度
			imgWidth = windowW*scale;//如大于窗口宽度，图片宽度进行缩放
						imgHeight = imgWidth/realWidth*realHeight;//等比例缩放高度
		} else if(realWidth*scaleMax<=windowW  &&  realHeight*scaleMax<=windowH){
			imgWidth = realWidth*scaleMax;
			imgHeight = realHeight*scaleMax;  //2.0
		} else if(realWidth*scaleMid<=windowW  &&  realHeight*scaleMid<=windowH){
			imgWidth = realWidth*scaleMid;
			imgHeight = realHeight*scaleMid;  //1.5
		} else if(realWidth*scaleMin<=windowW  &&  realHeight*scaleMin<=windowH){
			imgWidth = realWidth*scaleMin;
			imgHeight = realHeight*scaleMin;  //1.2
		} else {//如果图片真实高度和宽度都符合要求，高宽不变
			imgWidth = realWidth;
			imgHeight = realHeight;          //1.0
		}
		$('#bigimg').css("width",imgWidth);//以最终的宽度对图片缩放

		var w = (windowW-imgWidth)/2;//计算图片与窗口左边距
		var h = (windowH-imgHeight)/2;//计算图片与窗口上边距
		$('#innerdiv').css({"top":h, "left":w});//设置#innerdiv的top和left属性
		$('#outerdiv').fadeIn("fast");//淡入显示#outerdiv及.pimg
	});

		$('#outerdiv').click(function(){//再次点击淡出消失弹出层
		$(this).fadeOut("fast");
		});
}


function IsPC() {
	var Agents = ["Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod"];
	var userUse = navigator.userAgent;
	var flag = true;
	for (var v = 0; v < Agents.length; v++) {
		if (userUse.indexOf(Agents[v]) > 0) {
			flag = false;
			break;
		}
	}
	return flag;
}


var popupObjState = null;
var tempContentUrl = '';




